package com.aetherradio.app;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep screen on while app is in foreground (optional — remove if unwanted)
        // getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Do NOT pause the WebView — this keeps HTML5 audio playing in background.
        // Capacitor's BridgeActivity calls bridge.onPause() which pauses the WebView;
        // we intentionally skip that here so audio continues uninterrupted.
        if (bridge != null) {
            // Keep the JS timer and audio context alive
            bridge.getWebView().onResume();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (bridge != null) {
            bridge.getWebView().onResume();
        }
    }
}
