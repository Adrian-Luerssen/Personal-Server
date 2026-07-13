package com.adrianluerssen.personalserver.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

@CapacitorPlugin(name = "PersonalServerWidgets")
public class PersonalServerWidgetsPlugin extends Plugin {
    @PluginMethod
    public void saveSnapshot(PluginCall call) {
        JSObject snapshot = call.getObject("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }

        try {
            PersonalServerWidgetUpdater.saveSnapshot(getContext(), new JSONObject(snapshot.toString()));
            call.resolve();
        } catch (Exception exception) {
            call.reject("Failed to save widget snapshot", exception);
        }
    }

    @PluginMethod
    public void refreshWidgets(PluginCall call) {
        PersonalServerWidgetUpdater.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getWidgetStatus(PluginCall call) {
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("pinningSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported());
        result.put("lockScreenEligible", true);
        result.put(
            "lockScreenAvailability",
            "Samsung One UI may only expose Samsung-approved lock-screen widgets. The Personal Record keyguard widget is declared for Android versions and launchers that allow third-party lock-screen widgets."
        );
        call.resolve(result);
    }

    @PluginMethod
    public void pinWidget(PluginCall call) {
        String widget = call.getString("widget", "today");
        Class<?> provider = providerFor(widget);
        if (provider == null) {
            call.reject("Unknown widget: " + widget);
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !manager.isRequestPinAppWidgetSupported()) {
            JSObject result = new JSObject();
            result.put("requested", false);
            result.put("reason", "Home-screen widget pinning is not supported by this launcher.");
            call.resolve(result);
            return;
        }

        boolean requested = manager.requestPinAppWidget(new ComponentName(getContext(), provider), null, null);
        JSObject result = new JSObject();
        result.put("requested", requested);
        if ("lock".equals(widget)) {
            result.put("reason", "Android does not provide a normal third-party API to pin lock-screen widgets on Samsung One UI.");
        }
        call.resolve(result);
    }

    private Class<?> providerFor(String widget) {
        if ("today".equals(widget)) return PersonalServerTodayWidgetProvider.class;
        if ("habits".equals(widget)) return PersonalServerHabitsWidgetProvider.class;
        if ("lock".equals(widget)) return PersonalServerLockScreenWidgetProvider.class;
        return null;
    }
}
