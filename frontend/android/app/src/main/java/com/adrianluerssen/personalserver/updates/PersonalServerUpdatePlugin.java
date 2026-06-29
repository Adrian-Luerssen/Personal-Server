package com.adrianluerssen.personalserver.updates;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "PersonalServerUpdater")
public class PersonalServerUpdatePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject response = new JSObject();
        response.put("supported", true);
        response.put("canRequestPackageInstalls", canRequestPackageInstalls());
        response.put("requiresUnknownAppPermission", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O);
        call.resolve(response);
    }

    @PluginMethod
    public void installUpdate(PluginCall call) {
        String url = call.getString("url");
        String fileName = safeFileName(call.getString("fileName", "personal-server-update.apk"));
        if (url == null || !url.startsWith("https://")) {
            call.reject("A public HTTPS APK URL is required");
            return;
        }

        if (!canRequestPackageInstalls()) {
            openUnknownAppSettings();
            JSObject response = new JSObject();
            response.put("started", false);
            response.put("needsPermission", true);
            response.put("openedSettings", true);
            call.resolve(response);
            return;
        }

        executor.execute(() -> {
            try {
                File apkFile = downloadApk(url, fileName);
                openInstaller(apkFile);
                JSObject response = new JSObject();
                response.put("started", true);
                response.put("fileName", apkFile.getName());
                resolveOnMain(call, response);
            } catch (Exception exception) {
                rejectOnMain(call, "Failed to prepare APK installer", exception);
            }
        });
    }

    private boolean canRequestPackageInstalls() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        PackageManager packageManager = getContext().getPackageManager();
        return packageManager.canRequestPackageInstalls();
    }

    private void openUnknownAppSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private File downloadApk(String apkUrl, String fileName) throws Exception {
        File directory = new File(getContext().getCacheDir(), "updates");
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("Could not create update cache directory");
        }

        File apkFile = new File(directory, fileName);
        HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(60_000);
        connection.setRequestProperty("Accept", "application/vnd.android.package-archive,*/*");

        int code = connection.getResponseCode();
        if (code < 200 || code >= 300) {
            throw new IllegalStateException("APK download failed with HTTP " + code);
        }

        try (InputStream input = connection.getInputStream();
             FileOutputStream output = new FileOutputStream(apkFile, false)) {
            byte[] buffer = new byte[32_768];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
        } finally {
            connection.disconnect();
        }

        return apkFile;
    }

    private void openInstaller(File apkFile) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    private String safeFileName(String value) {
        String safe = value == null ? "" : value.replaceAll("[^a-zA-Z0-9._-]", "-");
        if (!safe.endsWith(".apk")) safe += ".apk";
        return safe.length() > 80 ? "personal-server-update.apk" : safe;
    }

    private void resolveOnMain(PluginCall call, JSObject response) {
        mainHandler.post(() -> call.resolve(response));
    }

    private void rejectOnMain(PluginCall call, String message, Exception exception) {
        mainHandler.post(() -> call.reject(message, exception));
    }
}
