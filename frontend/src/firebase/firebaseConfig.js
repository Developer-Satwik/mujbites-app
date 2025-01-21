import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUbykaRS-hD_Dn6cbTkJjql5iM3pJDUnU",
  authDomain: "mujbites-aed86.firebaseapp.com",
  projectId: "mujbites-aed86",
  storageBucket: "mujbites-aed86.appspot.com",
  messagingSenderId: "1015444127116",
  appId: "1:1015444127116:web:1fdd4d78d5dea97ba2aaa9",
};

// Initialize Firebase only once
let app = null;
let messagingInstance = null;

if (!app) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    if (!/already exists/.test(error.message)) {
      console.error("Firebase initialization error:", error);
    }
  }
}

// Get messaging instance only once
export const getMessagingInstance = () => {
  try {
    if (!messagingInstance && typeof window !== "undefined" && app) {
      messagingInstance = getMessaging(app);
      console.log("Firebase messaging instance created.");
    }
    return messagingInstance;
  } catch (error) {
    console.error("Error getting messaging instance:", error);
    return null;
  }
};

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    console.log("Checking notification permission...");

    if (!("Notification" in window)) {
      console.error("This browser does not support notifications.");
      return null;
    }

    const messaging = getMessagingInstance();
    if (!messaging) {
      console.error("Firebase messaging is not initialized.");
      return null;
    }

    // Check current permission status
    if (Notification.permission === "granted") {
      console.log("Notification permission already granted.");
      const token = await getToken(messaging, {
        vapidKey: "BDNGnSL8gU25V0g4uA8GDi88TFDhewVylFRz02cNSJV6ftgr-OkHI3ne7AEN-5iLhjpRflRhVNyy3cdfX94XWa4", // Replace with your VAPID key
      });
      console.log("FCM token generated:", token);
      return token;
    }

    // Request permission if not already granted
    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();
    console.log("Notification permission status:", permission);

    if (permission === "granted") {
      console.log("Notification permission granted.");
      const token = await getToken(messaging, {
        vapidKey: "BDNGnSL8gU25V0g4uA8GDi88TFDhewVylFRz02cNSJV6ftgr-OkHI3ne7AEN-5iLhjpRflRhVNyy3cdfX94XWa4", // Replace with your VAPID key
      });
      console.log("FCM token generated:", token);
      return token;
    } else {
      console.log("Notification permission denied.");
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};

// Set up onMessage listener for foreground notifications
export const setupForegroundNotificationListener = (callback) => {
  try {
    const messaging = getMessagingInstance();
    if (!messaging) {
      console.error("Firebase messaging is not initialized.");
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      if (callback && typeof callback === "function") {
        callback(payload);
      }
    });

    return unsubscribe; // Return the unsubscribe function for cleanup
  } catch (error) {
    console.error("Error setting up foreground notification listener:", error);
    return null;
  }
};

// Set up background message handler
export const setupBackgroundMessageHandler = () => {
  try {
    const messaging = getMessagingInstance();
    if (!messaging) {
      console.error("Firebase messaging is not initialized.");
      return;
    }

    // This will be handled by the service worker (firebase-messaging-sw.js)
    console.log("Background message handler is set up in the service worker.");
  } catch (error) {
    console.error("Error setting up background message handler:", error);
  }
};

// Initialize Firebase messaging and set up listeners
export const initializeFirebaseMessaging = async (callback) => {
  try {
    // Request notification permission
    const token = await requestNotificationPermission();

    // Set up foreground message listener
    const unsubscribeForeground = setupForegroundNotificationListener(callback);

    // Set up background message handler
    setupBackgroundMessageHandler();

    // Return the token and unsubscribe function for cleanup
    return {
      token,
      unsubscribeForeground,
    };
  } catch (error) {
    console.error("Error initializing Firebase messaging:", error);
    return null;
  }
};

// Cleanup Firebase messaging listeners
export const cleanupFirebaseMessaging = (unsubscribeForeground) => {
  try {
    if (unsubscribeForeground && typeof unsubscribeForeground === "function") {
      unsubscribeForeground(); // Unsubscribe from foreground messages
      console.log("Foreground notification listener unsubscribed.");
    }
  } catch (error) {
    console.error("Error cleaning up Firebase messaging:", error);
  }
};

export default {
  getMessagingInstance,
  requestNotificationPermission,
  setupForegroundNotificationListener,
  setupBackgroundMessageHandler,
  initializeFirebaseMessaging,
  cleanupFirebaseMessaging,
};