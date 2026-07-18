package com.adrianluerssen.personalserver.payments;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PaymentSuggestionActionReceiver extends BroadcastReceiver {
    public static final String ACTION_IGNORE = "com.adrianluerssen.personalserver.payments.IGNORE";
    public static final String EXTRA_SUGGESTION_ID = "paymentSuggestionId";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String id = intent.getStringExtra(EXTRA_SUGGESTION_ID);
        if (id == null || id.trim().length() == 0) return;
        if (!ACTION_IGNORE.equals(intent.getAction())) return;
        PaymentSuggestionStore.clearSuggestion(context, id);
        cancelNotification(context, id);
    }

    private void cancelNotification(Context context, String id) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(PaymentNotificationListenerService.notificationIdForSuggestionId(id));
    }
}
