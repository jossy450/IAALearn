package com.interviewassistant.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the in-app AudioRecorder Capacitor plugin for Android
        // Calling this before super.onCreate ensures the bridge picks it up during initialization
        registerPlugin(AudioRecorderPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
