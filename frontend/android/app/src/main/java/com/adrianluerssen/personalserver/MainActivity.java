package com.adrianluerssen.personalserver;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.adrianluerssen.personalserver.health.PersonalServerHealthPlugin;
import com.adrianluerssen.personalserver.payments.PersonalServerPaymentsPlugin;
import com.adrianluerssen.personalserver.widgets.PersonalServerWidgetsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PersonalServerHealthPlugin.class);
        registerPlugin(PersonalServerPaymentsPlugin.class);
        registerPlugin(PersonalServerWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
