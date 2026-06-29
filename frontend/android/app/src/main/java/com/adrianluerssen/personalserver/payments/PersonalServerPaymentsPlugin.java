package com.adrianluerssen.personalserver.payments;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "PersonalServerPayments")
public class PersonalServerPaymentsPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject response = new JSObject();
        response.put("supported", true);
        response.put("enabled", PaymentSuggestionStore.isEnabled(getContext()));
        response.put("notificationAccess", hasNotificationAccess());
        response.put("packages", PaymentSuggestionStore.getPackages(getContext()));
        response.put("pendingCount", PaymentSuggestionStore.getSuggestions(getContext()).length());
        call.resolve(response);
    }

    @PluginMethod
    public void configureDetection(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        JSArray packages = call.getArray("packages", new JSArray());
        PaymentSuggestionStore.setEnabled(getContext(), enabled);
        try {
            PaymentSuggestionStore.setPackages(getContext(), new JSONArray(packages.toString()));
        } catch (Exception ignored) {
            PaymentSuggestionStore.setPackages(getContext(), new JSONArray());
        }
        getStatus(call);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getPendingSuggestions(PluginCall call) {
        JSObject response = new JSObject();
        response.put("suggestions", PaymentSuggestionStore.getSuggestions(getContext()));
        call.resolve(response);
    }

    @PluginMethod
    public void clearSuggestion(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.trim().length() == 0) {
            call.reject("id is required");
            return;
        }
        PaymentSuggestionStore.clearSuggestion(getContext(), id);
        call.resolve();
    }

    private boolean hasNotificationAccess() {
        String enabledListeners = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        if (TextUtils.isEmpty(enabledListeners)) return false;

        String packageName = getContext().getPackageName();
        for (String listener : enabledListeners.split(":")) {
            ComponentName componentName = ComponentName.unflattenFromString(listener);
            if (componentName != null && packageName.equals(componentName.getPackageName())) {
                return true;
            }
        }
        return false;
    }
}
