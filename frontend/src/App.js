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

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Add a new notification
  const addNotification = useCallback((message) => {
    setNotifications((prev) => [{
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleString(),
      isRead: false,
    }, ...prev]);

    // Show browser notification if permission is granted
    if (Notification.permission === "granted") {
      new Notification("New Notification", { body: message });
    }
  }, []);

  // Mark a notification as read
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem("userToken");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/notifications`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to clear notifications");
      }

      setNotifications([]);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }, []);

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
      localStorage.clear();
      localStorage.setItem("userToken", token);
      localStorage.setItem("userId", user._id);
      localStorage.setItem("userRole", user.role);
      setIsLoggedIn(true);
      setUserRole(user.role);
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setIsLoggedIn(false);
      setUserRole(null);
      setCartItems([]);
      setNotifications([]);
      setIsCartOpen(false);

      if ("caches" in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        } catch (error) {
          console.error("Error clearing cache:", error);
        }
      }

      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
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

        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant: restaurantId,
            restaurantName,
            customer: userId,
            items,
            totalAmount,
            address,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to place order");
        }

        const data = await response.json();
        if (data) {
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