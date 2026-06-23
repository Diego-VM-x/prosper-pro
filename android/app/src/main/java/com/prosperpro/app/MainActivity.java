package com.prosperpro.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep a foreground service running so push notifications can be
        // delivered even when the app is in the background or closed by the
        // system on aggressive OEM skins.
        ProsperForegroundService.start(this);
    }
}
