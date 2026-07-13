package com.adrianluerssen.personalserver.payments;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.adrianluerssen.personalserver.MainActivity;

public class PaymentSuggestionActionReceiver extends BroadcastReceiver {
    public static final String ACTION_CONFIRM = "com.adrianluerssen.personalserver.payments.CONFIRM";
    public static final String ACTION_EDIT = "com.adrianluerssen.personalserver.payments.EDIT";
    public static final String ACTION_IGNORE = "com.adrianluerssen.personalserver.payments.IGNORE";
    public static final String EXTRA_SUGGESTION_ID = "paymentSuggestionId";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String id = intent.getStringExtra(EXTRA_SUGGESTION_ID);
        if (id == null || id.trim().length() == 0) return;
        if (ACTION_IGNORE.equals(intent.getAction())) {
            PaymentSuggestionStore.clearSuggestion(context, id);
            cancelNotification(context, id);
            return;
        }
        String action = ACTION_CONFIRM.equals(intent.getAction()) ? "confirm" : "edit";
        Intent review = new Intent(context, MainActivity.class);
        review.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        review.putExtra(EXTRA_SUGGESTION_ID, id);
        review.putExtra("captureAction", action);
        context.startActivity(review);
        cancelNotification(context, id);
    }

    private void cancelNotification(Context context, String id) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(PaymentNotificationListenerService.notificationIdForSuggestionId(id));
    }
}
