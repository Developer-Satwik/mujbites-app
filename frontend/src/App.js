import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Login from "./components/Auth/Login/Login";
import Signup from "./components/Auth/Signup/Signup";
import Home from "./components/Home/Home";
import AdminPanel from "./components/Admin/AdminPanel";
import RestaurantPanel from "./components/RestaurantPanel/RestaurantPanel";
import RestaurantMenu from "./components/RestaurantMenu/RestaurantMenu";
import EditMenuPage from "./components/EditMenuPage/EditMenuPage";
import PrivateRoute from "./PrivateRoute";
import Cart from "./components/Cart/Cart";
import YourOrders from "./components/Orders/YourOrders";
import Profile from "./components/Profile/Profile";
import "./App.css";
import api from "./components/utils/api";
import { getMessaging, deleteToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";

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
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Helper function to create a notification object
const createNotification = (message) => ({
  id: Date.now(),
  message,
  timestamp: new Date().toLocaleString(),
  isRead: false,
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [restaurantStatus, setRestaurantStatus] = useState("open");

  // Fetch user status on initial load
  useEffect(() => {
    const fetchUserStatus = async () => {
      const token = localStorage.getItem("userToken");
      const storedRole = localStorage.getItem("userRole");
      const storedUserId = localStorage.getItem("userId");

      if (token && storedRole && storedUserId) {
        setIsLoggedIn(true);
        setUserRole(storedRole);
      }
    };
    fetchUserStatus();
  }, []);

  // Fetch notifications for the logged-in user
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("userToken");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        console.error("User not authenticated or userId not found.");
        return;
      }

      const response = await api.get("/api/users/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        console.error("Rate limit exceeded. Please try again later.");
      } else {
        console.error("Error fetching notifications:", error);
      }
    }
  };

  // Add a new notification
  const addNotification = useCallback((message) => {
    setNotifications((prev) => [createNotification(message), ...prev]);

    // Show browser notification if permission is granted
    if (Notification.permission === "granted") {
      new Notification("New Notification", { body: message });

      // Play notification sound only if the user has interacted with the page
      if (document.hasFocus()) {
        const audio = new Audio("/notificationTone.mp3");
        audio.play().catch((error) =>
          console.error("Error playing notification sound:", error)
        );
      }
    }
  }, []);

  // Mark a notification as read
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem("userToken");
      await api.patch(
        `/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("userToken");
      await api.delete("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }, []);

  // Handle Firebase foreground messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);

      // Display a notification or update the UI
      const { title, body } = payload.notification || {};
      if (title && body) {
        addNotification(body);
      }
    });

    return () => unsubscribe();
  }, [addNotification]);

  // Fetch notifications when the user logs in
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
    }
  }, [isLoggedIn]);

  // Load cart items from localStorage on initial load
  useEffect(() => {
    const storedCart = localStorage.getItem("cartItems");
    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  // Save cart items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  // Handle user login
  const handleLogin = async (user, token) => {
    try {
      // Clear any existing tokens first
      localStorage.clear();

      // Set new authentication data
      localStorage.setItem("userToken", token);
      localStorage.setItem("userId", user._id);
      localStorage.setItem("userRole", user.role);

      // Update state
      setIsLoggedIn(true);
      setUserRole(user.role);

      // Register FCM token if available
      const fcmToken = localStorage.getItem("fcmToken");
      if (fcmToken) {
        try {
          await api.post("/api/tokens/register-token", {
            token: fcmToken,
            userId: user._id,
            device: {
              platform: navigator.platform,
              userAgent: navigator.userAgent,
            },
          });
          console.log("FCM token registered successfully");
        } catch (fcmError) {
          console.error("Failed to register FCM token:", fcmError);
          // Continue with login even if FCM registration fails
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      // Clear all localStorage items
      localStorage.clear();

      // Clear all sessionStorage items
      sessionStorage.clear();

      // Reset all state
      setIsLoggedIn(false);
      setUserRole(null);
      setCartItems([]);
      setNotifications([]);
      setIsCartOpen(false);

      // Clear service worker cache if it exists
      if ("caches" in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
          console.log("Cache cleared successfully");
        } catch (error) {
          console.error("Error clearing cache:", error);
        }
      }

      // Unregister service workers
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map((registration) => registration.unregister())
          );
          console.log("Service workers unregistered successfully");
        } catch (error) {
          console.error("Error unregistering service workers:", error);
        }
      }

      // Clear Firebase messaging token
      try {
        const fcmToken = localStorage.getItem("fcmToken");
        if (fcmToken) {
          await api.post("/api/tokens/deactivate-token", {
            token: fcmToken,
          });
        }
        await deleteToken(messaging);
        console.log("Firebase token deleted successfully");
      } catch (error) {
        console.error("Error deleting Firebase token:", error);
      }

      // Force reload the application to ensure clean state
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
      // Still redirect even if there were some errors
      window.location.href = "/login";
    }
  };

  // Handle user signup
  const handleSignup = (user) => {
    setIsLoggedIn(true);
    setUserRole(user.role);
    localStorage.setItem("userId", user._id);
    localStorage.setItem("userToken", user.token);
    localStorage.setItem("userRole", user.role);
    const redirectPath =
      user.role === "admin"
        ? "/admin-panel"
        : user.role === "restaurant"
        ? "/restaurant"
        : "/";
    window.location.href = redirectPath;
  };

  // Add an item to the cart
  const addToCart = useCallback((item) => {
    setCartItems((currentItems) => {
      if (currentItems.length === 0) {
        return [item];
      }

      if (currentItems[0].restaurantId === item.restaurantId) {
        const existingItemIndex = currentItems.findIndex(
          (cartItem) => cartItem.id === item.id && cartItem.size === item.size
        );

        if (existingItemIndex !== -1) {
          const updatedItems = [...currentItems];
          updatedItems[existingItemIndex].quantity += item.quantity;
          return updatedItems;
        }

        return [...currentItems, item];
      }

      alert(
        `Cannot add items from different restaurants. Your cart currently contains items from ${currentItems[0].restaurantName}`
      );
      return currentItems;
    });
  }, []);

  // Open and close cart functions
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // Update the quantity of a cart item
  const updateCartItemQuantity = useCallback((itemId, size, increment) => {
    setCartItems((currentItems) => {
      return currentItems
        .map((item) => {
          if (item.id === itemId && item.size === size) {
            const newQuantity = item.quantity + increment;
            if (newQuantity <= 0) {
              return null;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean);
    });
  }, []);

  // Clear the cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem("cartItems");
  }, []);

  // Toggle the cart open/close
  const toggleCart = useCallback(() => setIsCartOpen(!isCartOpen), [isCartOpen]);

  // Handle placing an order with retry mechanism
  const handlePlaceOrder = async () => {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const token = localStorage.getItem("userToken");
        const userId = localStorage.getItem("userId");
        const restaurantId = cartItems[0].restaurantId;
        const restaurantName = cartItems[0].restaurantName;
        const items = cartItems.map((item) => ({
          menuItem: item.id,
          itemName: item.name,
          quantity: item.quantity,
          size: item.size,
        }));
        const totalAmount = cartItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
        const address = "User Address";

        if (!restaurantId || !restaurantName || !items || !totalAmount || !address) {
          alert("Please fill in all required fields.");
          return;
        }

        const response = await api.post(
          "/api/orders",
          {
            restaurant: restaurantId,
            restaurantName,
            customer: userId,
            items,
            totalAmount,
            address,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data) {
          clearCart();
          closeCart();
          addNotification("Order placed successfully!");
          return;
        }
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    alert("Failed to place order after multiple attempts. Please try again.");
  };

  return (
    <Router>
      <div className="App">
        <Navbar
          isLoggedIn={isLoggedIn}
          userRole={userRole}
          onLogout={handleLogout}
          onCartClick={toggleCart}
          notifications={notifications}
          markNotificationAsRead={markNotificationAsRead}
          clearAllNotifications={clearAllNotifications}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
          <Route
            path="/admin-panel"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AdminPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/restaurant"
            element={
              <PrivateRoute allowedRoles={["restaurant"]}>
                <RestaurantPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/restaurant/:id"
            element={
              <RestaurantMenu 
                addToCart={addToCart} 
                openCart={openCart} 
              />
            }
          />
          <Route
            path="/edit-menu/:restaurantId"
            element={
              <PrivateRoute allowedRoles={["restaurant"]}>
                <EditMenuPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/your-orders"
            element={<YourOrders addNotification={addNotification} />}
          />
          <Route
            path="/profile"
            element={
              isLoggedIn ? <Profile /> : <Navigate to="/login" replace={true} />
            }
          />
        </Routes>
        {isCartOpen && (
          <Cart
            cartItems={cartItems}
            onClose={closeCart}
            onPlaceOrder={handlePlaceOrder}
            updateQuantity={updateCartItemQuantity}
            clearCart={clearCart}
            restaurantStatus={restaurantStatus}
          />
        )}
      </div>
    </Router>
  );
}

export default App;