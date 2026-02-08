import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.interviewassistant.app',
  appName: 'Interview Assistant',
  webDir: 'dist',
  server: {
    // Load bundled web assets from the app itself.
    // For API calls, the React app should use an explicit base URL
    // (e.g. http://10.152.201.17:3001) instead of relying on this.
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'interview-assistant-key'
    },
    backgroundColor: '#3b82f6'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#3b82f6'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#3b82f6'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
