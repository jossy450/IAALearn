import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.interviewassistant.app',
  appName: 'Interview Assistant',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'interviewassistant.app',
    iosScheme: 'capacitor',
    // For development, uncomment and use your local IP
    // url: 'http://192.168.1.100:5173',
    // cleartext: true
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
