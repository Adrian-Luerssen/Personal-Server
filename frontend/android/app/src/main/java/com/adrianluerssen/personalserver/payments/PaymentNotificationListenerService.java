package com.adrianluerssen.personalserver.payments;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;
import com.adrianluerssen.personalserver.MainActivity;
import com.adrianluerssen.personalserver.R;
import org.json.JSONArray;
import org.json.JSONObject;

public class PaymentNotificationListenerService extends NotificationListenerService {
    private static final String CHANNEL_ID = "personal-server-payments";
    private static final int NOTIFICATION_ID_BASE = 610000;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (!PaymentSuggestionStore.isEnabled(this)) return;
        String packageName = sbn.getPackageName();
        if (packageName == null || packageName.equals(getPackageName())) return;
        if (!isAllowedPackage(packageName)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && CHANNEL_ID.equals(notification.getChannelId())) return;

        Bundle extras = notification.extras;
        String title = getExtraText(extras, Notification.EXTRA_TITLE);
        String text = getExtraText(extras, Notification.EXTRA_TEXT);
        String bigText = getExtraText(extras, Notification.EXTRA_BIG_TEXT);
        String combinedText = text + (bigText.length() > 0 ? " " + bigText : "");

        try {
            JSONObject suggestion = PaymentNotificationParser.parse(
                packageName,
                sbn.getKey(),
                getAppLabel(packageName),
                title,
                combinedText,
                sbn.getPostTime()
            );
            if (suggestion == null) return;

            boolean stored = PaymentSuggestionStore.addSuggestion(this, suggestion);
            if (stored) showDetectedPaymentNotification(suggestion);
        } catch (Exception ignored) {
            // Notification parsing should never destabilize the listener service.
        }
    }

    private boolean isAllowedPackage(String packageName) {
        JSONArray configured = PaymentSuggestionStore.getPackages(this);
        if (configured.length() == 0) return true;
        for (int i = 0; i < configured.length(); i += 1) {
            String allowed = configured.optString(i, "");
            if (allowed.length() > 0 && packageName.equals(allowed)) return true;
        }
        return false;
    }

    private String getExtraText(Bundle extras, String key) {
        if (extras == null) return "";
        CharSequence value = extras.getCharSequence(key);
        return value == null ? "" : value.toString();
    }

    private String getAppLabel(String packageName) {
        try {
            PackageManager packageManager = getPackageManager();
            return packageManager.getApplicationLabel(packageManager.getApplicationInfo(packageName, 0)).toString();
        } catch (Exception ignored) {
            return packageName;
        }
    }

    private void showDetectedPaymentNotification(JSONObject suggestion) {
        ensureChannel();
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("route", "/finance/transactions");
        intent.putExtra("paymentSuggestionId", suggestion.optString("id"));

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            suggestion.optString("id").hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String merchant = suggestion.optString("merchantRaw", "Detected payment");
        String currency = suggestion.optString("currency", "EUR");
        String amount = String.format(java.util.Locale.ROOT, "%.2f", suggestion.optDouble("amount", 0));

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_personal_server)
            .setContentTitle("Register payment?")
            .setContentText(merchant + " - " + amount + " " + currency)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(notificationIdForSuggestionId(suggestion.optString("id")), builder.build());
        }
    }

    public static int notificationIdForSuggestionId(String id) {
        return NOTIFICATION_ID_BASE + Math.abs(String.valueOf(id).hashCode() % 10000);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Detected payments",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Prompts to register card payments in Personal Record.");
        manager.createNotificationChannel(channel);
    }
}
