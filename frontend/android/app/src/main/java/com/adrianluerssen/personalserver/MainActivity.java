package com.adrianluerssen.personalserver;

import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.adrianluerssen.personalserver.health.PersonalServerHealthPlugin;
import com.adrianluerssen.personalserver.payments.PersonalServerPaymentsPlugin;
import com.adrianluerssen.personalserver.updates.PersonalServerUpdatePlugin;
import com.adrianluerssen.personalserver.widgets.PersonalServerWidgetsPlugin;

public class MainActivity extends BridgeActivity {
    private static final int NATIVE_SHELL_COLOR = Color.rgb(5, 6, 7);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PersonalServerHealthPlugin.class);
        registerPlugin(PersonalServerPaymentsPlugin.class);
        registerPlugin(PersonalServerUpdatePlugin.class);
        registerPlugin(PersonalServerWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
        configureSystemBars();
        configureBackNavigation();
        openPaymentReview(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openPaymentReview(intent);
    }

    private void openPaymentReview(Intent intent) {
        if (intent == null) return;
        String suggestionId = intent.getStringExtra("paymentSuggestionId");
        if (suggestionId == null || suggestionId.trim().length() == 0) return;
        String action = intent.getStringExtra("captureAction");
        String route = "/finance/transactions?paymentSuggestionId=" + Uri.encode(suggestionId)
            + "&captureAction=" + Uri.encode(action == null ? "edit" : action);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        webView.postDelayed(() -> webView.evaluateJavascript(
            "window.history.pushState({},''," + org.json.JSONObject.quote(route) + ");window.dispatchEvent(new PopStateEvent('popstate'));",
            null
        ), 700);
    }

    private void configureSystemBars() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(NATIVE_SHELL_COLOR);
        window.setNavigationBarColor(NATIVE_SHELL_COLOR);

        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(NATIVE_SHELL_COLOR);
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.setBackgroundColor(NATIVE_SHELL_COLOR);
        }

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

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    }

    private void configureBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    moveTaskToBack(true);
                    return;
                }

                webView.evaluateJavascript(
                    "(function(){return window.personalServerHandleNativeBack ? window.personalServerHandleNativeBack() : false;})()",
                    handled -> {
                        if ("true".equals(handled)) {
                            return;
                        }
                        if (webView.canGoBack()) {
                            webView.goBack();
                            return;
                        }
                        moveTaskToBack(true);
                    }
                );
            }
        });
    }
}
