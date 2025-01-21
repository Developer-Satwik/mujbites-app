import React, { useState, useEffect } from "react";
import axios from "axios";
import "./YourOrders.css";

const YourOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("userToken"); // Get token

        // Check for token before making the request
        if (!token) {
          setError("User not logged in."); // Or redirect to login
          setLoading(false);
          return;
        }

        const authHeader = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const response = await axios.get("/api/users/orders", authHeader);
        setOrders(response.data);
      } catch (err) {
        console.error("Error fetching orders:", err); // Log the error

        // Handle different error cases
        if (err.response && err.response.status === 401) {
          setError("Unauthorized. Please log in again.");
        } else {
          setError("Failed to fetch orders.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="your-orders-container">
      <h2>Your Orders</h2>
      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="no-orders">No orders found.</div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <h3>Order #{order._id}</h3>
                <p className="order-status">
                  Status:{" "}
                  <span
                    className={`status ${order.orderStatus.replace(/ /g, "-")}`}
                  >
                    {order.orderStatus}
                  </span>
                </p>
              </div>
              <div className="order-body">
                <p>
                  <b>Restaurant:</b> {order.restaurant.name}
                </p>
                <p>
                  <b>Date:</b>{" "}
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <p>
                  <b>Items:</b>
                </p>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.menuItem._id}>
                      <span>{item.itemName || 'Unknown Item'}</span> ({item.size}) - Qty: {item.quantity} - Price:{" "}
                      {typeof item.menuItem.sizes === 'object' 
                        ? item.menuItem.sizes[item.size] 
                        : item.menuItem.sizes.get(item.size)
                      }
                    </li>
                  ))}
                </ul>
                <p className="order-total">
                  <b>Total:</b> {order.totalAmount}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default YourOrders;