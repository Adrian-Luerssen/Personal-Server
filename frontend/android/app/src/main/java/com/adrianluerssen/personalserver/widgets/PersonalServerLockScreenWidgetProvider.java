package com.adrianluerssen.personalserver.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class PersonalServerLockScreenWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        PersonalServerWidgetUpdater.updateLockScreenWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onEnabled(Context context) {
        PersonalServerWidgetUpdater.updateAll(context);
    }
}
