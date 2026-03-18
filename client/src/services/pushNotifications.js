import { Capacitor } from '@capacitor/core';

let pushNotificationsPlugin = null;

export const initializePushNotifications = async () => {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    console.log('Push notifications: web platform, skipping');
    return;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    pushNotificationsPlugin = PushNotifications;
    
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'denied') {
      console.warn('Push Notifications permission denied');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push token:', token.value);
      // Send to backend if needed
      try {
        const api = (await import('./api')).default;
        await api.post('/push/register-token', { token: token.value });
      } catch(e) {}
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification:', notification);
    });

    console.log('Push notifications initialized');
  } catch (error) {
    console.warn('Push notifications init failed:', error);
  }
};

export const flushPendingPushToken = async () => {
  // Implementation if needed
};

export default {
  initializePushNotifications,
  flushPendingPushToken,
};
