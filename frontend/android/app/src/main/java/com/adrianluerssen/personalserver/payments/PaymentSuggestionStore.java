package com.adrianluerssen.personalserver.payments;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

public final class PaymentSuggestionStore {
    private static final String PREFS = "personal_server_payments";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_PACKAGES = "packages";
    private static final String KEY_SUGGESTIONS = "suggestions";
    private static final int MAX_SUGGESTIONS = 50;

    private PaymentSuggestionStore() {}

    public static boolean isEnabled(Context context) {
        return prefs(context).getBoolean(KEY_ENABLED, false);
    }

    public static void setEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply();
    }

    public static JSONArray getPackages(Context context) {
        return readArray(context, KEY_PACKAGES);
    }

    public static void setPackages(Context context, JSONArray packages) {
        prefs(context).edit().putString(KEY_PACKAGES, packages.toString()).apply();
    }

    public static JSONArray getSuggestions(Context context) {
        return readArray(context, KEY_SUGGESTIONS);
    }

    public static synchronized boolean addSuggestion(Context context, JSONObject suggestion) {
        JSONArray current = getSuggestions(context);
        String eventHash = suggestion.optString("eventHash", "");
        JSONArray next = new JSONArray();
        boolean exists = false;

        for (int i = 0; i < current.length(); i += 1) {
            JSONObject item = current.optJSONObject(i);
            if (item == null) continue;
            if (eventHash.equals(item.optString("eventHash"))) exists = true;
            next.put(item);
        }

        if (exists) return false;
        next.put(suggestion);

        while (next.length() > MAX_SUGGESTIONS) {
            JSONArray trimmed = new JSONArray();
            for (int i = 1; i < next.length(); i += 1) {
                trimmed.put(next.optJSONObject(i));
            }
            next = trimmed;
        }

        prefs(context).edit().putString(KEY_SUGGESTIONS, next.toString()).apply();
        return true;
    }

    public static synchronized void clearSuggestion(Context context, String id) {
        JSONArray current = getSuggestions(context);
        JSONArray next = new JSONArray();
        for (int i = 0; i < current.length(); i += 1) {
            JSONObject item = current.optJSONObject(i);
            if (item == null) continue;
            if (id.equals(item.optString("id")) || id.equals(item.optString("eventHash"))) continue;
            next.put(item);
        }
        prefs(context).edit().putString(KEY_SUGGESTIONS, next.toString()).apply();
    }

    public static synchronized JSONArray removeSuggestionsFromPackage(Context context, String packageName) {
        JSONArray current = getSuggestions(context);
        JSONArray next = new JSONArray();
        JSONArray removed = new JSONArray();

        for (int i = 0; i < current.length(); i += 1) {
            JSONObject item = current.optJSONObject(i);
            if (item == null) continue;
            if (packageName != null && packageName.equals(item.optString("sourcePackage"))) {
                removed.put(item);
                continue;
            }
            next.put(item);
        }

        if (removed.length() > 0) {
            prefs(context).edit().putString(KEY_SUGGESTIONS, next.toString()).apply();
        }

        return removed;
    }

    private static JSONArray readArray(Context context, String key) {
        try {
            return new JSONArray(prefs(context).getString(key, "[]"));
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
