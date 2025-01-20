importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUbykaRS-hD_Dn6cbTkJjql5iM3pJDUnU",
  authDomain: "mujbites-aed86.firebaseapp.com",
  projectId: "mujbites-aed86",
  storageBucket: "mujbites-aed86.appspot.com",
  messagingSenderId: "1015444127116",
  appId: "1:1015444127116:web:1fdd4d78d5dea97ba2aaa9",
};

// Initialize Firebase App only if it hasn't been initialized already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  // Customize notification title and body based on the payload
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "New Order Received";
  const notificationBody =
    payload.notification?.body ||
    payload.data?.body ||
    "A new order has been placed at your restaurant.";

  // Notification options
  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || "/logo192.png", // Fallback to a default icon
    badge: payload.notification?.badge || "/logo192.png", // Fallback to a default badge
    data: payload.data || {}, // Include any additional data
    vibrate: [200, 100, 200], // Vibration pattern for mobile devices
    timestamp: Date.now(), // Timestamp for the notification
  };

  // Show the notification
  self.registration
    .showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log("Notification shown successfully.");
    })
    .catch((error) => {
      console.error("Error showing notification:", error);
    });
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  // Close the notification
  event.notification.close();

  // Extract data from the notification payload
  const notificationData = event.notification.data;

  // Handle the click action (e.g., open a specific URL)
  const url = notificationData?.url || "/"; // Fallback to the root URL

  event.waitUntil(
    clients
      .matchAll({ type: "window" })
      .then((windowClients) => {
        // Check if there's already a window open with the target URL
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        return clients.openWindow(url);
      })
  );
});

// Handle notification close events (optional)
self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);

  // You can log analytics or perform other actions when a notification is closed
  const notificationData = event.notification.data;
  if (notificationData && notificationData.orderId) {
    console.log(`Notification for order ${notificationData.orderId} was closed.`);
  }
});

// Handle push subscription changes (optional)
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Push subscription changed:", event);

  // Handle subscription changes (e.g., renew the subscription)
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BDNGnSL8gU25V0g4uA8GDi88TFDhewVylFRz02cNSJV6ftgr-OkHI3ne7AEN-5iLhjpRflRhVNyy3cdfX94XWa4", // Replace with your VAPID key
      })
      .then((newSubscription) => {
        console.log("New subscription:", newSubscription);
        // Send the new subscription to your server
        return fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tokens`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newSubscription),
        });
      })
      .catch((error) => {
        console.error("Error renewing push subscription:", error);
      })
  );
});

// Handle service worker installation
self.addEventListener("install", (event) => {
  console.log("Service worker installed.");
  event.waitUntil(self.skipWaiting()); // Activate the service worker immediately
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("Service worker activated.");
  event.waitUntil(self.clients.claim()); // Take control of all clients
});