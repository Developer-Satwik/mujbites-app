import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { FaShoppingCart, FaBars, FaBell } from "react-icons/fa";
import logo from "./mujbites.png";

function Navbar({ onCartClick, notifications, markNotificationAsRead, clearAllNotifications }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const isRestaurantMenuPage = location.pathname.startsWith("/restaurant/");
  const isRestaurantPanel = location.pathname === "/restaurant"; // Check if on restaurant panel
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navbarRef = useRef(null);
  const sidebarRef = useRef(null);
  const notificationsRef = useRef(null);

  const isLoggedIn = !!localStorage.getItem("userToken");
  const userRole = localStorage.getItem("userRole");

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("cartItems");
    navigate("/login");
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleNotifications = async () => {
    if (!isNotificationsOpen) {
      setLoading(true);
      setError(null);
      try {
        // Simulate fetching notifications (replace with actual API call)
        // await fetchNotifications();
        setIsNotificationsOpen(true);
      } catch (err) {
        setError("Failed to load notifications. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setIsNotificationsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      const sidebarHeight = sidebarRef.current.scrollHeight;
      navbarRef.current.style.height = `${sidebarHeight + 60}px`;
    } else if (!isOpen && navbarRef.current) {
      navbarRef.current.style.height = "60px";
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close notifications dropdown if clicked outside
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !event.target.closest(".notification-icon") // Check if the click is on the notification button
      ) {
        setIsNotificationsOpen(false);
      }

      // Close sidebar if clicked outside
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target) &&
        !event.target.classList.contains("hamburger-icon")
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="page-layout">
      {/* Cart and Notification Icons */}
      {isLoggedIn && (
        <>
          {/* Hide cart icon on restaurant panel */}
          {!isRestaurantPanel && (
            <div className="cart-icon">
              <button onClick={onCartClick}>
                <FaShoppingCart />
              </button>
            </div>
          )}
          {/* Always show notifications button */}
          <div className={`notification-icon ${isRestaurantPanel ? "notification-icon-restaurant" : ""}`}>
            <button onClick={toggleNotifications}>
              <FaBell />
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <span className="notification-badge">
                  {notifications.filter((n) => !n.isRead).length}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="notification-dropdown" ref={notificationsRef}>
                <div className="notification-header">
                  <h4>Notifications</h4>
                  <button
                    className="clear-all-button"
                    onClick={clearAllNotifications}
                    disabled={notifications.length === 0}
                  >
                    Clear All
                  </button>
                </div>
                {loading ? (
                  <div className="notification-item">Loading...</div>
                ) : error ? (
                  <div className="notification-item error">{error}</div>
                ) : notifications.length === 0 ? (
                  <div className="notification-item">No New notifications</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <p>{notification.message}</p>
                      <small>{notification.timestamp}</small>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Navbar */}
      <nav className={`navbar ${isOpen ? "open" : ""}`} ref={navbarRef}>
        <div className="hamburger-icon" onClick={toggleSidebar}>
          <FaBars />
        </div>

        <div className="sidebar" ref={sidebarRef}>
          <ul className="nav-menu">
            <li className="nav-item">
              <Link
                to="/"
                className={`nav-links ${location.pathname === "/" ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
            </li>

            {!isLoggedIn && (
              <>
                <li className="nav-item">
                  <Link
                    to="/login"
                    className={`nav-links ${location.pathname === "/login" ? "active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="/signup"
                    className={`nav-links ${location.pathname === "/signup" ? "active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    Signup
                  </Link>
                </li>
              </>
            )}

            {isLoggedIn && (
              <>
                {userRole === "admin" && (
                  <li className="nav-item">
                    <Link
                      to="/admin-panel"
                      className={`nav-links ${location.pathname === "/admin-panel" ? "active" : ""}`}
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  </li>
                )}

                {userRole === "restaurant" && (
                  <li className="nav-item">
                    <Link
                      to="/restaurant"
                      className={`nav-links ${location.pathname === "/restaurant" ? "active" : ""}`}
                      onClick={() => setIsOpen(false)}
                    >
                      Restaurant Panel
                    </Link>
                  </li>
                )}

                {userRole === "user" && (
                  <>
                    <li className="nav-item">
                      <Link
                        to="/your-orders"
                        className={`nav-links ${location.pathname === "/your-orders" ? "active" : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        Your Orders
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        to="/profile"
                        className={`nav-links ${location.pathname === "/profile" ? "active" : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        Profile
                      </Link>
                    </li>
                  </>
                )}

                <li className="nav-item">
                  <button onClick={handleLogout} className="nav-links logout-button">
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>

      {/* Content Section */}
      {(isHomePage || isRestaurantMenuPage) && (
        <div className={`content ${isOpen ? "shifted" : ""}`}>
          <div className="header">
            {isHomePage && <img src={logo} alt="Logo" className="logo" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;