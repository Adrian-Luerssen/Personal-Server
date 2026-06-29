package com.adrianluerssen.personalserver;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.adrianluerssen.personalserver.health.PersonalServerHealthPlugin;
import com.adrianluerssen.personalserver.payments.PersonalServerPaymentsPlugin;
import com.adrianluerssen.personalserver.widgets.PersonalServerWidgetsPlugin;

public class MainActivity extends BridgeActivity {
    private static final int NATIVE_SHELL_COLOR = Color.rgb(3, 7, 18);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PersonalServerHealthPlugin.class);
        registerPlugin(PersonalServerPaymentsPlugin.class);
        registerPlugin(PersonalServerWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
        configureSystemBars();
    }

    private void configureSystemBars() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(NATIVE_SHELL_COLOR);
        window.setNavigationBarColor(NATIVE_SHELL_COLOR);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(NATIVE_SHELL_COLOR);
        }

        View decorView = window.getDecorView();
        int flags = decorView.getSystemUiVisibility();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        decorView.setSystemUiVisibility(flags);
    }
}
