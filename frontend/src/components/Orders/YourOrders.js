import React, { useEffect, useState } from "react";
import axios from "axios";
import "./YourOrders.css";

const YourOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("userToken");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        throw new Error("User not authenticated or userId not found.");
      }

      // Set a timeout for the request (e.g., 10 seconds)
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => {
        source.cancel("Request timed out after 10 seconds.");
      }, 10000);

      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/orders?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cancelToken: source.token, // Attach the cancel token
        }
      );

      // Clear the timeout if the request completes
      clearTimeout(timeout);

      if (response.data.orders) {
        setOrders(response.data.orders);
      } else {
        throw new Error("No orders found in the response.");
      }
    } catch (err) {
      console.error("Error fetching orders:", err.message);
      setError(err.message || "Failed to fetch orders. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-refresh every 1 minute (60,000 milliseconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 60000); // 1 minute

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div className="your-orders-loading">Loading your orders...</div>;
  }

  if (error) {
    return <div className="your-orders-error">Error: {error}</div>;
  }

  return (
    <div className="your-orders-container">
      <h1 className="your-orders-header">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="no-orders">No orders found.</p>
      ) : (
        <ul className="your-orders-list">
          {orders.map((order) => (
            <li key={order._id} className="your-order-item">
              <div className="order-body">
                <p>
                  <b>Restaurant:</b> {order.restaurant?.name || "N/A"}
                </p>
                <p>
                  <b>Ordered At:</b>{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "N/A"}
                </p>
                <p className="order-total">
                  <b>Total Amount:</b> ₹{order.totalAmount?.toFixed(2) || "0.00"}
                </p>
                <p className="order-status">
                  <b>Status:</b> {order.orderStatus || "Unknown"}
                </p>
                {order.orderStatus === "Cancelled" && order.cancellationReason && (
                  <p className="cancellation-reason">
                    <b>Cancellation Reason:</b> {order.cancellationReason}
                  </p>
                )}
                <div className="order-items">
                  <b> Items:</b>
                  <ul>
                    {order.items?.map((item, index) => (
                      <li key={index}>
                        {item.itemName || "Unknown Item"} - {item.quantity}x
                      </li>
                    )) || <li>No items available</li>}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default YourOrders;