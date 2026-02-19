import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';

/**
 * Initialize push notifications for native platforms.
 * Requests permission, registers with FCM, and sends token to backend.
 */
export const initializePushNotifications = async () => {
  const isNative = (Capacitor.isNativePlatform?.() ?? false) || Capacitor.getPlatform() !== 'web';
  if (!isNative) {
    console.log('Push notifications: web platform, skipping native initialization');
    return;
  }

  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'denied') {
      console.warn('Push Notifications permission denied');
      return;
    }

    // Register with FCM and get token
    await PushNotifications.register();

    // Listen for token received event
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push notification token received:', token.value);
      // Send token to backend
      await sendTokenToBackend(token.value);
    });

    // Listen for push notification received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      handlePushNotification(notification);
    });

    // Listen for push notification action (user taps notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification);
      handlePushNotificationAction(notification);
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push notification registration error:', error);
    });

    console.log('Push notifications initialized successfully');
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
};

/**
 * Send FCM token to backend for later use
 */
const sendTokenToBackend = async (token) => {
  try {
    // If no auth token is present, queue the push token for later to avoid 401s
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) {
        console.log('[pushNotifications] No auth token present; queuing push token');
        localStorage.setItem('pendingPushToken', token);
        return;
      }
    } catch (e) {
      // ignore localStorage issues
    }

    await api.post('/push/register-token', { token });
    console.log('Push token registered with backend');
    // Clear any pending token if it matches
    try {
      const pending = localStorage.getItem('pendingPushToken');
      if (pending === token) localStorage.removeItem('pendingPushToken');
    } catch (_) {}
  } catch (error) {
    console.error('Failed to register push token with backend:', error?.response?.data || error.message || error);
    // If server responded 401 (not authenticated), queue token for later
    if (error?.response?.status === 401) {
      try {
        localStorage.setItem('pendingPushToken', token);
      } catch (_) {}
    }
  }
};

// Attempt to flush any pending push token (call after successful auth)
const flushPendingPushToken = async () => {
  try {
    const pending = localStorage.getItem('pendingPushToken');
    if (pending) {
      console.log('[pushNotifications] Flushing pending push token');
      await sendTokenToBackend(pending);
    }
  } catch (err) {
    console.error('[pushNotifications] Failed to flush pending push token:', err);
  }
};

/**
 * Handle push notification when app is in foreground
 */
const handlePushNotification = (notification) => {
  const { title, body, data } = notification.notification;
  console.log(`Notification: ${title} - ${body}`, data);
  // You can dispatch a Redux action, show a toast, etc.
};

/**
 * Handle push notification action (user interaction)
 */
const handlePushNotificationAction = (notification) => {
  const { actionId, notification: notifData } = notification;
  console.log('Push action performed:', actionId, notifData);
  // Handle action based on actionId (e.g., navigate to specific page)
};

export default {
  initializePushNotifications,
  sendTokenToBackend,
  flushPendingPushToken,
};
