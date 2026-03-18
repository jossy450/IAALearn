import { Capacitor } from '@capacitor/core';

let analytics = null;
let initialized = false;

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAAG97vXKCStScRyzmmBOvNV-mV-SBVHZI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "iaalearn.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "iaalearn",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "iaalearn.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "859557481151",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:859557481151:web:b737d7f38ddc148b3bd40a",
  measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || "G-G4V4Y40921"
});

export const initializeAnalytics = async () => {
  if (initialized) return;
  
  try {
    const { initializeApp } = await import('firebase/app');
    const { getAnalytics, logEvent, setUserId: firebaseSetUserId, setUserProperties: firebaseSetUserProperties } = await import('firebase/analytics');
    
    const app = initializeApp(getFirebaseConfig());
    analytics = { app, logEvent, firebaseSetUserId, firebaseSetUserProperties };

    if (Capacitor.isNativePlatform()) {
      try {
        const { FirebaseAnalytics } = await import('@capacitor-community/firebase-analytics');
        await FirebaseAnalytics.initializeFirebase();
      } catch (e) {
        console.warn('Firebase native init failed:', e);
      }
    }

    initialized = true;
  } catch (e) {
    console.warn('Firebase init failed:', e);
    initialized = true;
  }
};

export const trackPageView = async (pageName, pagePath) => {
  try {
    if (!initialized) await initializeAnalytics();
    
    const params = {
      page_title: pageName,
      page_location: pagePath,
      page_path: pagePath
    };

    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import('@capacitor-community/firebase-analytics');
      await FirebaseAnalytics.logEvent({ name: 'page_view', params });
    } else if (analytics) {
      analytics.logEvent(analytics.app, 'page_view', params);
    }
  } catch (e) {}
};

export const trackEvent = async (eventName, params = {}) => {
  try {
    if (!initialized) await initializeAnalytics();

    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import('@capacitor-community/firebase-analytics');
      await FirebaseAnalytics.logEvent({ name: eventName, params });
    } else if (analytics) {
      analytics.logEvent(analytics.app, eventName, params);
    }
  } catch (e) {}
};

export const setUserId = async (userId) => {
  try {
    if (!initialized) await initializeAnalytics();

    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import('@capacitor-community/firebase-analytics');
      await FirebaseAnalytics.setUserId({ userId });
    } else if (analytics) {
      analytics.firebaseSetUserId(analytics.app, userId);
    }
  } catch (e) {}
};

export const setUserProperties = async (properties) => {
  try {
    if (!initialized) await initializeAnalytics();

    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import('@capacitor-community/firebase-analytics');
      await FirebaseAnalytics.setUserProperties({ properties });
    } else if (analytics) {
      analytics.firebaseSetUserProperties(analytics.app, properties);
    }
  } catch (e) {}
};

export const trackSession = async () => {
  await trackEvent('session_start', {
    platform: Capacitor.getPlatform(),
    timestamp: new Date().toISOString()
  });
};

export const trackButtonClick = async (buttonName, location) => {
  await trackEvent('button_click', {
    button_name: buttonName,
    location: location,
    platform: Capacitor.getPlatform()
  });
};

export const trackSignup = async (method) => {
  await trackEvent('sign_up', { method, platform: Capacitor.getPlatform() });
};

export const trackLogin = async (method) => {
  await trackEvent('login', { method, platform: Capacitor.getPlatform() });
};

export const trackSessionStart = async (type) => {
  await trackEvent('session_start', { session_type: type, platform: Capacitor.getPlatform() });
};

export default {
  initializeAnalytics,
  trackPageView,
  trackEvent,
  setUserId,
  setUserProperties,
  trackSession,
  trackButtonClick,
  trackSignup,
  trackLogin,
  trackSessionStart
};
