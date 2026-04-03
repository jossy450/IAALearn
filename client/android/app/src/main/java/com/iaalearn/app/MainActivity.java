package com.iaalearn.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Handle intent for OAuth callback
        handleIntent(getIntent());
        
        // Enable edge-to-edge display
        enableEdgeToEdge();
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle new intent for OAuth callback
        handleIntent(intent);
    }
    
    private void handleIntent(Intent intent) {
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            String url = intent.getDataString();
            if (url != null) {
                // Store the URL in shared preferences or pass to JS
                getIntent().putExtra("deep_link", url);
                // The Capacitor App plugin will handle this
                System.out.println("[DeepLink] Received: " + url);
            }
        }
    }
    
    private void enableEdgeToEdge() {
        // Make the app draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Get the WindowInsetsController
        WindowInsetsControllerCompat windowInsetsController = 
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        if (windowInsetsController != null) {
            // Configure the system bars appearance
            windowInsetsController.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
        
        // Keep screen on during interviews (optional)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
