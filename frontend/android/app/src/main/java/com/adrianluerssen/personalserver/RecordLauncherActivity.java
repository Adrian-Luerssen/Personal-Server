package com.adrianluerssen.personalserver;

/**
 * Versioned launcher component. Keeping the Capacitor implementation in
 * MainActivity while changing the concrete launcher class forces OEM launchers
 * to discard icons cached against the retired component.
 */
public class RecordLauncherActivity extends MainActivity {
}
