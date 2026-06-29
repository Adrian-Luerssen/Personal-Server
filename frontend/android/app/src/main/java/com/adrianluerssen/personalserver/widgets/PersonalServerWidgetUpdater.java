package com.adrianluerssen.personalserver.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

import com.adrianluerssen.personalserver.MainActivity;
import com.adrianluerssen.personalserver.R;

import org.json.JSONObject;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class PersonalServerWidgetUpdater {
    private static final String PREFS_NAME = "personal_server_widgets";
    private static final String KEY_SNAPSHOT = "snapshot";

    private PersonalServerWidgetUpdater() {}

    public static void saveSnapshot(Context context, JSONObject snapshot) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        preferences.edit().putString(KEY_SNAPSHOT, snapshot.toString()).apply();
        updateAll(context);
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        updateWidgets(context, manager, PersonalServerTodayWidgetProvider.class, true);
        updateWidgets(context, manager, PersonalServerHabitsWidgetProvider.class, false);
        updateLockWidgets(context, manager);
    }

    static void updateTodayWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        WidgetSnapshot snapshot = loadSnapshot(context);
        WidgetPalette palette = WidgetPalette.from(context);
        for (int widgetId : widgetIds) {
            RemoteViews views = buildTodayViews(context, snapshot, palette);
            manager.updateAppWidget(widgetId, views);
        }
    }

    static void updateHabitsWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        WidgetSnapshot snapshot = loadSnapshot(context);
        WidgetPalette palette = WidgetPalette.from(context);
        for (int widgetId : widgetIds) {
            RemoteViews views = buildHabitsViews(context, snapshot, palette);
            manager.updateAppWidget(widgetId, views);
        }
    }

    static void updateLockScreenWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        WidgetSnapshot snapshot = loadSnapshot(context);
        WidgetPalette palette = WidgetPalette.from(context);
        for (int widgetId : widgetIds) {
            RemoteViews views = buildLockScreenViews(context, snapshot, palette);
            manager.updateAppWidget(widgetId, views);
        }
    }

    private static void updateWidgets(
        Context context,
        AppWidgetManager manager,
        Class<?> providerClass,
        boolean today
    ) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, providerClass));
        if (today) updateTodayWidgets(context, manager, ids);
        else updateHabitsWidgets(context, manager, ids);
    }

    private static void updateLockWidgets(Context context, AppWidgetManager manager) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PersonalServerLockScreenWidgetProvider.class));
        updateLockScreenWidgets(context, manager, ids);
    }

    private static WidgetSnapshot loadSnapshot(Context context) {
        String raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_SNAPSHOT, "{}");
        try {
            return WidgetSnapshot.from(new JSONObject(raw));
        } catch (Exception exception) {
            return WidgetSnapshot.empty();
        }
    }

    private static RemoteViews buildTodayViews(Context context, WidgetSnapshot snapshot, WidgetPalette palette) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today_summary);
        applyTodayPalette(views, palette);
        views.setTextViewText(R.id.widget_today_score, String.valueOf(snapshot.score));
        views.setTextViewText(R.id.widget_today_habits, snapshot.habitsDone + "/" + snapshot.habitsTotal);
        views.setTextViewText(R.id.widget_today_workouts, String.valueOf(snapshot.workoutsThisWeek));
        views.setTextViewText(R.id.widget_today_spend, "EUR " + snapshot.monthlySpend);
        views.setTextViewText(R.id.widget_today_streams, String.valueOf(snapshot.streams));
        views.setTextViewText(R.id.widget_today_status, snapshot.status);
        views.setTextViewText(R.id.widget_today_updated, snapshot.updatedLabel);
        views.setOnClickPendingIntent(R.id.widget_today_root, launchAppIntent(context));
        return views;
    }

    private static RemoteViews buildHabitsViews(Context context, WidgetSnapshot snapshot, WidgetPalette palette) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_habits_summary);
        applyHabitsPalette(views, palette);
        views.setTextViewText(R.id.widget_habits_ratio, snapshot.habitsDone + "/" + snapshot.habitsTotal);
        views.setTextViewText(R.id.widget_habits_remaining, snapshot.habitsRemaining + " remaining");
        views.setTextViewText(R.id.widget_habits_status, snapshot.habitsRemaining == 0 ? "Daily list clear" : "Needs logging");
        views.setTextViewText(R.id.widget_habits_updated, snapshot.updatedLabel);
        views.setOnClickPendingIntent(R.id.widget_habits_root, launchAppIntent(context));
        return views;
    }

    private static RemoteViews buildLockScreenViews(Context context, WidgetSnapshot snapshot, WidgetPalette palette) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_lock_screen_summary);
        applyLockPalette(views, palette);
        views.setTextViewText(R.id.widget_lock_score, String.valueOf(snapshot.score));
        views.setTextViewText(R.id.widget_lock_habits, snapshot.habitsDone + "/" + snapshot.habitsTotal);
        views.setTextViewText(R.id.widget_lock_status, snapshot.lockScreenStatus);
        views.setTextViewText(R.id.widget_lock_updated, snapshot.updatedLabel);
        views.setOnClickPendingIntent(R.id.widget_lock_root, launchAppIntent(context));
        return views;
    }

    private static void applyTodayPalette(RemoteViews views, WidgetPalette palette) {
        int[] primaryTextIds = new int[] {
            R.id.widget_today_title,
            R.id.widget_today_score,
            R.id.widget_today_habits,
            R.id.widget_today_workouts,
            R.id.widget_today_spend,
            R.id.widget_today_streams
        };
        int[] secondaryTextIds = new int[] {
            R.id.widget_today_label,
            R.id.widget_today_habits_label,
            R.id.widget_today_workouts_label,
            R.id.widget_today_spend_label,
            R.id.widget_today_streams_label,
            R.id.widget_today_status,
            R.id.widget_today_updated
        };

        views.setInt(R.id.widget_today_root, "setBackgroundColor", palette.background);
        for (int id : primaryTextIds) views.setTextColor(id, palette.primaryText);
        for (int id : secondaryTextIds) views.setTextColor(id, palette.secondaryText);
        views.setInt(R.id.widget_today_score_box, "setBackgroundColor", palette.accentMuted);
        views.setTextColor(R.id.widget_today_score, palette.accent);
    }

    private static void applyHabitsPalette(RemoteViews views, WidgetPalette palette) {
        int[] primaryTextIds = new int[] {
            R.id.widget_habits_title,
            R.id.widget_habits_ratio,
            R.id.widget_habits_status
        };
        int[] secondaryTextIds = new int[] {
            R.id.widget_habits_label,
            R.id.widget_habits_remaining,
            R.id.widget_habits_updated
        };

        views.setInt(R.id.widget_habits_root, "setBackgroundColor", palette.background);
        for (int id : primaryTextIds) views.setTextColor(id, palette.primaryText);
        for (int id : secondaryTextIds) views.setTextColor(id, palette.secondaryText);
        views.setInt(R.id.widget_habits_score_box, "setBackgroundColor", palette.accentMuted);
        views.setTextColor(R.id.widget_habits_ratio, palette.accent);
    }

    private static void applyLockPalette(RemoteViews views, WidgetPalette palette) {
        int[] primaryTextIds = new int[] {
            R.id.widget_lock_title,
            R.id.widget_lock_score,
            R.id.widget_lock_habits,
            R.id.widget_lock_status
        };
        int[] secondaryTextIds = new int[] {
            R.id.widget_lock_score_label,
            R.id.widget_lock_updated
        };

        views.setInt(R.id.widget_lock_root, "setBackgroundColor", palette.background);
        for (int id : primaryTextIds) views.setTextColor(id, palette.primaryText);
        for (int id : secondaryTextIds) views.setTextColor(id, palette.secondaryText);
        views.setInt(R.id.widget_lock_score_box, "setBackgroundColor", palette.accentMuted);
        views.setTextColor(R.id.widget_lock_score, palette.accent);
    }

    private static PendingIntent launchAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, 1001, intent, flags);
    }

    static final class WidgetSnapshot {
        final int score;
        final int habitsDone;
        final int habitsTotal;
        final int habitsRemaining;
        final int workoutsThisWeek;
        final int monthlySpend;
        final int streams;
        final String status;
        final String lockScreenStatus;
        final String updatedLabel;

        private WidgetSnapshot(
            int score,
            int habitsDone,
            int habitsTotal,
            int habitsRemaining,
            int workoutsThisWeek,
            int monthlySpend,
            int streams,
            String status,
            String lockScreenStatus,
            String updatedLabel
        ) {
            this.score = score;
            this.habitsDone = habitsDone;
            this.habitsTotal = habitsTotal;
            this.habitsRemaining = habitsRemaining;
            this.workoutsThisWeek = workoutsThisWeek;
            this.monthlySpend = monthlySpend;
            this.streams = streams;
            this.status = status;
            this.lockScreenStatus = lockScreenStatus;
            this.updatedLabel = updatedLabel;
        }

        static WidgetSnapshot from(JSONObject json) {
            int habitsTotal = json.optInt("habitsTotal", 0);
            int habitsDone = json.optInt("habitsDone", 0);
            int habitsRemaining = json.optInt("habitsRemaining", Math.max(0, habitsTotal - habitsDone));
            return new WidgetSnapshot(
                json.optInt("score", 0),
                habitsDone,
                habitsTotal,
                habitsRemaining,
                json.optInt("workoutsThisWeek", 0),
                json.optInt("monthlySpend", 0),
                json.optInt("streams", 0),
                json.optString("status", "Open app to sync"),
                json.optString("lockScreenStatus", formatLockScreenStatus(habitsTotal, habitsRemaining)),
                formatUpdated(json.optString("generatedAt", ""))
            );
        }

        static WidgetSnapshot empty() {
            return new WidgetSnapshot(0, 0, 0, 0, 0, 0, 0, "Open app to sync", "Open app to sync", "No local snapshot");
        }

        private static String formatLockScreenStatus(int habitsTotal, int habitsRemaining) {
            if (habitsTotal == 0) return "No active habits";
            if (habitsRemaining == 0) return "All habits logged";
            return habitsRemaining + (habitsRemaining == 1 ? " habit remaining" : " habits remaining");
        }

        private static String formatUpdated(String isoValue) {
            if (isoValue == null || isoValue.isEmpty()) return "No local snapshot";
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm")
                    .withZone(ZoneId.systemDefault());
                return "Updated " + formatter.format(Instant.parse(isoValue));
            } catch (Exception exception) {
                return "Updated recently";
            }
        }
    }

    static final class WidgetPalette {
        final int background;
        final int primaryText;
        final int secondaryText;
        final int accent;
        final int accentMuted;

        private WidgetPalette(int background, int primaryText, int secondaryText, int accent, int accentMuted) {
            this.background = background;
            this.primaryText = primaryText;
            this.secondaryText = secondaryText;
            this.accent = accent;
            this.accentMuted = accentMuted;
        }

        static WidgetPalette from(Context context) {
            boolean dark = (context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
            int background = dark ? Color.rgb(16, 22, 36) : Color.rgb(248, 250, 252);
            int primary = dark ? Color.rgb(230, 238, 246) : Color.rgb(15, 23, 42);
            int secondary = dark ? Color.rgb(165, 176, 195) : Color.rgb(71, 85, 105);
            int accent = dark ? Color.rgb(125, 211, 252) : Color.rgb(2, 132, 199);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                background = systemColor(context, dark ? "system_neutral1_900" : "system_neutral1_50", background);
                primary = systemColor(context, dark ? "system_neutral1_50" : "system_neutral1_900", primary);
                secondary = systemColor(context, dark ? "system_neutral2_200" : "system_neutral2_700", secondary);
                accent = systemColor(context, dark ? "system_accent1_200" : "system_accent1_600", accent);
            }

            int muted = Color.argb(dark ? 56 : 42, Color.red(accent), Color.green(accent), Color.blue(accent));
            return new WidgetPalette(background, primary, secondary, accent, muted);
        }

        private static int systemColor(Context context, String name, int fallback) {
            int id = context.getResources().getIdentifier(name, "color", "android");
            if (id == 0) return fallback;
            try {
                return context.getColor(id);
            } catch (Exception exception) {
                return fallback;
            }
        }
    }
}
