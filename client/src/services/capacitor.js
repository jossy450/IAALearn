import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

class CapacitorService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();
  }

  // Initialize Capacitor plugins
  async initialize() {
    if (!this.isNative) return;

    try {
      // Configure status bar
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#3b82f6' });

      // Hide splash screen
      await SplashScreen.hide();

      // Setup app listeners
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active:', isActive);
      });

      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });

      // Monitor network status
      Network.addListener('networkStatusChange', status => {
        console.log('Network status changed', status);
        this.handleNetworkChange(status);
      });

      console.log('Capacitor initialized successfully');
    } catch (error) {
      console.error('Capacitor initialization error:', error);
    }
  }

  // Haptic feedback
  async hapticImpact(style = ImpactStyle.Medium) {
    if (!this.isNative) return;
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.error('Haptic error:', error);
    }
  }

  // Vibrate
  async vibrate(duration = 100) {
    if (!this.isNative) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.error('Vibrate error:', error);
    }
  }

  // Check network status
  async getNetworkStatus() {
    if (!this.isNative) {
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }
    try {
      return await Network.getStatus();
    } catch (error) {
      console.error('Network status error:', error);
      return { connected: true, connectionType: 'unknown' };
    }
  }

  // Handle network changes
  handleNetworkChange(status) {
    if (!status.connected) {
      console.log('Network disconnected - switching to offline mode');
      // Dispatch custom event for app to handle
      window.dispatchEvent(new CustomEvent('network-offline'));
    } else {
      console.log('Network connected');
      window.dispatchEvent(new CustomEvent('network-online'));
    }
  }

  // Show/hide keyboard
  async hideKeyboard() {
    if (!this.isNative) return;
    try {
      await Keyboard.hide();
    } catch (error) {
      console.error('Hide keyboard error:', error);
    }
  }

  // Get app info
  async getAppInfo() {
    if (!this.isNative) {
      return { version: '2.0.0', build: 'web' };
    }
    try {
      return await App.getInfo();
    } catch (error) {
      console.error('Get app info error:', error);
      return null;
    }
  }

  // Exit app
  async exitApp() {
    if (!this.isNative) return;
    try {
      await App.exitApp();
    } catch (error) {
      console.error('Exit app error:', error);
    }
  }

  // Check if running on mobile
  isMobile() {
    return this.isNative || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Get platform
  getPlatform() {
    return this.platform;
  }

  // Request permissions (if needed for audio recording)
  async requestPermissions() {
    if (!this.isNative) return { granted: true };
    
    // Audio permissions are handled by the browser's getUserMedia
    return { granted: true };
  }
}

export default new CapacitorService();
