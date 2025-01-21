import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase/firebaseConfig"; // Import the already initialized Firebase app
import api from "./utils/api"; // Import the api helper

// Get Firebase Messaging instance
const messaging = getMessaging(app);

// Request notification permission and get Firebase token
const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");

      // Get the FCM token
      const token = await getToken(messaging, {
        vapidKey: "BDNGnSL8gU25V0g4uA8GDi88TFDhewVylFRz02cNSJV6ftgr-OkHI3ne7AEN-5iLhjpRflRhVNyy3cdfX94XWa4", // Replace with your VAPID key
      });
      console.log("Firebase Token:", token);

      // Send the token to your server
      const userId = localStorage.getItem("userId"); // Retrieve userId from localStorage
      if (userId) {
        try {
          await api.post("/api/tokens", { token, userId });
          console.log("Token saved to server.");
        } catch (error) {
          console.error("Error saving token to server:", error);
        }
      } else {
        console.log("User ID not found in localStorage.");
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
};

// Request permission when the app loads
requestPermission();

// Render the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report web vitals (optional)
reportWebVitals();