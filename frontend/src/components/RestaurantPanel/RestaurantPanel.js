import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './RestaurantPanel.css';
import { FaCog, FaCheckCircle, FaTimesCircle, FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
  timeout: 10000,
});

const RestaurantPanel = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurantId, setRestaurantId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [isOpen, setIsOpen] = useState(false);
  const [openingTime, setOpeningTime] = useState('');
  const [currentOpeningTime, setCurrentOpeningTime] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeclineDropdown, setShowDeclineDropdown] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();

  const prevOrdersRef = useRef();

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  const fetchRestaurantData = useCallback(async () => {
    if (!userId) {
      setError('User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/api/restaurants/owner/${userId}`);
      if (response.data && response.data._id) {
        setRestaurantId(response.data._id);
        setIsOpen(response.data.isActive || false);
        setCurrentOpeningTime(response.data.openingTime || '');
      } else {
        throw new Error('No restaurant data found');
      }
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError(err.response?.data?.message || 'Failed to fetch restaurant data');
    }
  }, [userId]);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) {
      console.log('No restaurant ID available');
      return;
    }

    try {
      const response = await api.get(`/api/restaurants/${restaurantId}/orders`);
      if (response.data && Array.isArray(response.data)) {
        const sortedOrders = response.data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sortedOrders);
        setError('');
      } else {
        throw new Error('Invalid orders data format');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchRestaurantData();
    };
    initializeData();
  }, [fetchRestaurantData]);

  useEffect(() => {
    if (restaurantId) {
      fetchOrders();
      const intervalId = setInterval(fetchOrders, 30000);
      return () => clearInterval(intervalId);
    }
  }, [restaurantId, fetchOrders]);

  const handleOrderStatusUpdate = async (orderId, newStatus, reason = '') => {
    try {
      const response = await api.put(`/api/restaurants/orders/${orderId}`, {
        status: newStatus,
        cancellationReason: reason,
      });

      if (response.data) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId
              ? { ...order, orderStatus: newStatus, cancellationReason: reason }
              : order
          )
        );
        setShowDeclineDropdown(null);
        setCancellationReason('');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleDeclineOrder = (orderId) => {
    setShowDeclineDropdown(orderId);
  };

  const handleConfirmDecline = (orderId) => {
    if (!cancellationReason) {
      alert('Please select a reason for cancellation.');
      return;
    }
    handleOrderStatusUpdate(orderId, 'Cancelled', cancellationReason);
  };

  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case 'pending':
        return ['Placed', 'Accepted'].includes(order.orderStatus);
      case 'completed':
        return order.orderStatus === 'Delivered';
      case 'cancelled':
        return order.orderStatus === 'Cancelled';
      default:
        return true;
    }
  });

  const handleToggleStatus = async () => {
    if (!restaurantId) return;

    try {
      await api.put(`/api/restaurants/${restaurantId}/toggle-status`, {});
      setIsOpen(!isOpen);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleSetOpeningTime = async () => {
    if (!restaurantId || !openingTime) {
      alert('Please select a valid opening time.');
      return;
    }

    try {
      await api.put(`/api/restaurants/${restaurantId}/set-opening-time`, { openingTime });
      alert('Opening time set successfully!');
      setCurrentOpeningTime(openingTime);
    } catch (error) {
      console.error('Failed to set opening time:', error);
      alert('Failed to set opening time. Please try again.');
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();
  const formatPrice = (price) => `₹${Number(price).toFixed(2)}`;
  const calculateTotalItems = (orderItems) => orderItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="restaurant-panel">
      <div className="dashboard-header">
        <h1>Restaurant Dashboard</h1>
        <div className="toggle-buttons">
          <button
            className={activeTab === 'pending' ? 'active' : ''}
            onClick={() => setActiveTab('pending')}
          >
            <span>Pending</span>
            <span>Orders</span>
          </button>
          <button
            className={activeTab === 'completed' ? 'active' : ''}
            onClick={() => setActiveTab('completed')}
          >
            <span>Completed</span>
            <span>Orders</span>
          </button>
          <button
            className={activeTab === 'cancelled' ? 'active' : ''}
            onClick={() => setActiveTab('cancelled')}
          >
            <span>Cancelled</span>
            <span>Orders</span>
          </button>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="orders-container">
          {filteredOrders.length === 0 ? (
            <p className="no-orders">No {activeTab} orders found.</p>
          ) : (
            filteredOrders.map((order) => (
              <div key={order._id} className="card">
                <div className="order-header">
                  <span className="order-id">Order #{order._id.slice(-6)}</span>
                  <span className={`order-status ${order.orderStatus.toLowerCase()}`}>
                    {order.orderStatus}
                  </span>
                </div>
                <div className="order-details">
                  <h3>Customer Information</h3>
                  <div className="customer-info">
                    {order.orderStatus === 'Placed' || order.orderStatus === 'Cancelled' ? (
                      <>
                        <p><strong>Name:</strong> *****</p>
                        <p><strong>Phone:</strong> *****</p>
                      </>
                    ) : (
                      <>
                        <p><strong>Name:</strong> {order.customer?.username || 'Anonymous'}</p>
                        <p><strong>Phone:</strong> {order.customer?.mobileNumber || 'N/A'}</p>
                      </>
                    )}
                    <p><strong>Address:</strong> {order.customer?.address || 'N/A'}</p>
                  </div>
                  <h3>Order Summary</h3>
                  <div className="order-summary">
                    <p><strong>Total Items:</strong> {calculateTotalItems(order.items)}</p>
                    <p><strong>Amount:</strong> {formatPrice(order.totalAmount)}</p>
                    <p><strong>Ordered at:</strong> {formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="order-items">
                  <h3>Order Items</h3>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index} className="order-item">
                        <div className="item-details">
                          <span className="item-name">{item.itemName || 'Unknown Item'}</span>
                          <span className="item-size">{item.size}</span>
                          <span className="item-quantity">x{item.quantity}</span>
                        </div>
                        {item.notes && <div className="item-notes">Note: {item.notes}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
                {['Placed', 'Accepted'].includes(order.orderStatus) && (
                  <div className="order-actions">
                    {order.orderStatus === 'Placed' && (
                      <>
                        <button
                          className="accept-btn"
                          onClick={() => handleOrderStatusUpdate(order._id, 'Accepted')}
                        >
                          <FaCheckCircle /> Accept
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => handleDeclineOrder(order._id)}
                        >
                          <FaTimesCircle /> Decline
                        </button>
                        {showDeclineDropdown === order._id && (
                          <div className="decline-dropdown">
                            <select
                              value={cancellationReason}
                              onChange={(e) => setCancellationReason(e.target.value)}
                            >
                              <option value="">Select a reason</option>
                              <option value="Items not available">Items not available</option>
                              <option value="Shop Closed">Shop Closed</option>
                              <option value="Other">Other</option>
                            </select>
                            <button onClick={() => handleConfirmDecline(order._id)}>Confirm</button>
                            <button onClick={() => setShowDeclineDropdown(null)}>Cancel</button>
                          </div>
                        )}
                      </>
                    )}
                    {order.orderStatus === 'Accepted' && (
                      <button
                        className="deliver-btn"
                        onClick={() => handleOrderStatusUpdate(order._id, 'Delivered')}
                      >
                        <FaTruck /> Mark as Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      <div className="settings-button" onClick={() => setShowSettings(!showSettings)}>
        <div className="edit-post">
          <span className="edit-tooltip">Settings</span>
          <span className="edit-icon"><FaCog /></span>
        </div>
      </div>
      {showSettings && (
        <div className="settings-dropdown open">
          <label>
            Restaurant Status:
            <div className="toggle-switch">
              <input type="checkbox" checked={isOpen} onChange={handleToggleStatus} />
              <span className="toggle-slider"></span>
            </div>
            {isOpen ? 'Open' : 'Closed'}
          </label>
          <input
            type="datetime-local"
            value={openingTime}
            onChange={(e) => setOpeningTime(e.target.value)}
          />
          <button onClick={handleSetOpeningTime}>Set Opening Time</button>
          <button onClick={() => navigate(`/edit-menu/${restaurantId}`)}>Edit Menu</button>
        </div>
      )}
    </div>
  );
};

export default RestaurantPanel;