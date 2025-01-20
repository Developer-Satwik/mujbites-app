import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Ensure this import is correct and points to your CSS file
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUbykaRS-hD_Dn6cbTkJjql5iM3pJDUnU",
  authDomain: "mujbites-aed86.firebaseapp.com",
  projectId: "mujbites-aed86",
  storageBucket: "mujbites-aed86.appspot.com",
  messagingSenderId: "1015444127116",
  appId: "1:1015444127116:web:1fdd4d78d5dea97ba2aaa9",
};

// Initialize Firebase
let app;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully.");

  // Initialize Firebase Messaging
  messaging = getMessaging(app);
  console.log("Firebase Messaging initialized successfully.");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Request notification permission and get Firebase token
const requestPermission = async () => {
  if (!messaging) {
    console.error("Firebase Messaging is not initialized.");
    return;
  }

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
            // Handle the conflict (e.g., show a warning to the user)
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          console.log("Token saved to server.");
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

// Listen for incoming messages (foreground notifications)
if (messaging) {
  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);

    // Display a notification or update the UI
    const { title, body } = payload.notification || {};
    if (title && body) {
      new Notification(title, { body });
    }

    // Optionally, you can update the UI or state in your app
    // For example, you can use a global state management library like Redux or Context API
    // to trigger a re-render when a new notification is received.
  });
}

// Request permission when the app loads
requestPermission();

// Create a root for rendering the app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please refresh the page.</h1>;
    }

    return this.props.children;
  }
}

// Render the App component inside React.StrictMode and ErrorBoundary
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register the service worker for handling background notifications
const serviceWorkerUrl = `${process.env.PUBLIC_URL}/firebase-messaging-sw.js`; // Ensure the correct path

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(serviceWorkerUrl)
      .then((registration) => {
        console.log('Service Worker registered: ', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed: ', error);
      });
  });
}

// Optional: Measure performance in your app
// Pass a function to log results (e.g., reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();