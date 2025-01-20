import { useEffect, useCallback, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import {
  getMessagingInstance,
  requestNotificationPermission,
} from "./firebaseConfig";

const VAPID_KEY =
  "BDNGnSL8gU25V0g4uA8GDi88TFDhewVylFRz02cNSJV6ftgr-OkHI3ne7AEN-5iLhjpRflRhVNyy3cdfX94XWa4";

const useFirebaseMessaging = (addNotification) => {
  const setupCompleteRef = useRef(false);
  const unsubscribeRef = useRef(null);

  // Save FCM token to the server
  const saveTokenToServer = useCallback(async (token, userId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Include the auth token
        },
        body: JSON.stringify({ token, userId }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          const data = await response.json();
          console.log(data.message); // Log the conflict message
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        console.log("Token saved to server.");
      }

      return true;
    } catch (error) {
      console.error("Error saving token to server:", error);
      return false;
    }
  }, []);

  // Set up Firebase messaging
  const setupMessaging = useCallback(async () => {
    const messaging = getMessagingInstance();
    if (!messaging) {
      console.error("Firebase messaging is not initialized.");
      return;
    }

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.error("User ID not found in localStorage.");
        return;
      }

      // Check if notification permission is already granted
      if (Notification.permission === "granted") {
        console.log("Notification permission already granted.");
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        const existingToken = localStorage.getItem("fcmToken");

        // Save the token to the server if it's new
        if (currentToken !== existingToken) {
          const saved = await saveTokenToServer(currentToken, userId);
          if (saved) {
            localStorage.setItem("fcmToken", currentToken);
            console.log("FCM token saved to server and localStorage.");
          }
        }
        return;
      }

      // Request notification permission if not already granted
      console.log("Requesting notification permission...");
      const permission = await requestNotificationPermission();
      if (permission === "granted") {
        console.log("Notification permission granted.");
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        const existingToken = localStorage.getItem("fcmToken");

        // Save the token to the server if it's new
        if (currentToken !== existingToken) {
          const saved = await saveTokenToServer(currentToken, userId);
          if (saved) {
            localStorage.setItem("fcmToken", currentToken);
            console.log("FCM token saved to server and localStorage.");
          }
        }
      } else {
        console.log("Notification permission denied.");
      }
    } catch (error) {
      console.error("Error setting up messaging:", error);
    }
  }, [saveTokenToServer]);

  // Handle incoming messages (foreground)
  const handleMessage = useCallback(
    (payload) => {
      console.log("Foreground message received:", payload);

      const title = payload.notification?.title || "New Notification";
      const body = payload.notification?.body || "You have a new message";

      // Add the notification to the state or context
      if (addNotification && typeof addNotification === "function") {
        addNotification({ title, body });
      }

      // Play a notification sound (optional)
      const audio = new Audio("/notificationTone.mp3"); // Replace with your sound file path
      audio.play().catch((error) => {
        console.error("Error playing notification sound:", error);
      });

      // Show a browser notification if permission is granted
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      }
    },
    [addNotification]
  );

  // Set up Firebase messaging and listeners
  useEffect(() => {
    // Prevent setup if already completed
    if (setupCompleteRef.current) return;

    const messaging = getMessagingInstance();
    if (!messaging) return;

    const setup = async () => {
      await setupMessaging();

      // Set up foreground message listener
      unsubscribeRef.current = onMessage(messaging, handleMessage);

      setupCompleteRef.current = true;
    };

    setup();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current(); // Unsubscribe from the foreground listener
        unsubscribeRef.current = null;
      }
    };
  }, [setupMessaging, handleMessage]);

  // Return the FCM token for external use (optional)
  const getFCMToken = useCallback(async () => {
    const messaging = getMessagingInstance();
    if (!messaging) {
      console.error("Firebase messaging is not initialized.");
      return null;
    }

    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      return token;
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }, []);

  return { getFCMToken };
};

export default useFirebaseMessaging;