import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api'; // Use the centralized API utility
import './Cart.css';

const Cart = ({ cartItems, onClose, updateQuantity, clearCart, restaurantStatus }) => {
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState(null);
  const [address, setAddress] = useState('');
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const navigate = useNavigate();

  // Save cart items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Check if the user is logged in and fetch their address
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserId = localStorage.getItem('userId');
    setIsLoggedIn(!!token);
    setUserId(storedUserId);
  }, []);

  // Fetch the user's address if logged in
  useEffect(() => {
    const fetchUserAddress = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          console.error('No token found in localStorage');
          return;
        }

        const response = await api.get('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200 && response.data) {
          setAddress(response.data.address || '');
        } else {
          console.error('Unexpected response:', response);
          setError('Error fetching user address. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching user address:', error);
        if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (error.response?.status === 404) {
          setError('User profile not found. Please contact support.');
        } else {
          setError('Error fetching user address. Please try again.');
        }
      }
    };

    if (isLoggedIn) {
      fetchUserAddress();
    }
  }, [isLoggedIn]);

  // Calculate the total cost of items in the cart
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  // Calculate the total number of items in the cart
  const totalItemsInCart = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Handle the initiation of the order process
  const handleInitiateOrder = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    if (restaurantStatus === 'closed') {
      setError('The restaurant is currently closed. Please try again later.');
      return;
    }

    const total = calculateTotal();
    if (total < 100) {
      setError('Minimum order amount is ₹100.');
      return;
    }

    setShowAddressPopup(true);
  };

  // Redirect the user to the login page
  const handleRedirectToLogin = () => {
    onClose();
    navigate('/login');
  };

  // Save the address and place the order
  const handleSaveAddress = async () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    if (restaurantStatus === 'closed') {
      setError('The restaurant is currently closed. Please try again later.');
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        setShowLoginPrompt(true);
        return;
      }

      // Update the user's address using the general profile update endpoint
      const addressResponse = await api.put(
        '/api/users/profile',
        { address },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (addressResponse.status === 200) {
        setShowAddressPopup(false);
        setIsEditingAddress(false);
        setIsPlacingOrder(true);

        // Prepare the order data
        const orderData = {
          restaurant: cartItems[0].restaurantId,
          restaurantName: cartItems[0].restaurantName,
          items: cartItems.map((item) => ({
            menuItem: item.id,
            itemName: item.name,
            quantity: item.quantity,
            size: item.size || 'Regular',
          })),
          totalAmount: calculateTotal(),
          address: address,
        };

        // Place the order
        const orderResponse = await api.post('/api/orders', orderData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (orderResponse.status === 201) {
          setOrderPlaced(true);
          clearCart();

          setTimeout(() => {
            setOrderPlaced(false);
            navigate('/your-orders');
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error saving address or placing order:', error);
      if (error.response?.status === 401) {
        setShowLoginPrompt(true);
      } else if (error.response?.status === 404) {
        setError('Restaurant or user not found. Please contact support.');
      } else {
        setError('Error saving address or placing order. Please try again.');
      }
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-container" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2>Your Cart</h2>
          <h3>{cartItems[0]?.restaurantName}</h3>
          <button className="close-button" onClick={onClose}>
            &#10005; {/* X icon */}
          </button>
          <button className="clear-cart-button" onClick={clearCart}>
            Clear Cart
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-items">
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div className="cart-item" key={`${item.id}-${item.size}`}>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-size"> ({item.size})</span>
                  </div>
                  <div className="item-quantity">
                    <button
                      className="quantity-btn"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.id, item.size, -1)}
                    >
                      -
                    </button>
                    <span>x {item.quantity}</span>
                    <button
                      className="quantity-btn"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.id, item.size, 1)}
                      disabled={totalItemsInCart >= 20}
                    >
                      +
                    </button>
                  </div>
                  <div className="item-price">
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="total">
                <span>Total:</span>
                <span>₹{calculateTotal()}</span>
              </div>
              <button
                className="place-order-button"
                onClick={handleInitiateOrder}
                disabled={
                  calculateTotal() < 100 ||
                  totalItemsInCart > 20 ||
                  restaurantStatus === 'closed' ||
                  isPlacingOrder
                }
              >
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
              {calculateTotal() < 100 && (
                <p className="minimum-order-error">Minimum order amount is ₹100.</p>
              )}
              {totalItemsInCart > 20 && (
                <p className="maximum-items-error">You cannot have more than 20 items in your cart.</p>
              )}
              {restaurantStatus === 'closed' && (
                <p className="restaurant-closed-error">The restaurant is currently closed. Please try again later.</p>
              )}
            </div>
          </>
        )}

        {showAddressPopup && (
          <div className="address-popup">
            <h3>{isEditingAddress ? 'Edit Address' : 'Confirm Address'}</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your delivery address"
            />
            <div className="address-popup-buttons">
              <button onClick={handleSaveAddress}>Save & Place Order</button>
              <button onClick={() => setShowAddressPopup(false)}>Cancel</button>
            </div>
          </div>
        )}

        {showLoginPrompt && (
          <div className="popup show login-prompt">
            <p>Please log in to place your order</p>
            <button onClick={handleRedirectToLogin} className="login-button">
              Login
            </button>
            <button onClick={() => setShowLoginPrompt(false)} className="cancel-button">
              Cancel
            </button>
          </div>
        )}

        {orderPlaced && (
          <div className="popup show">
            <p>Order placed successfully!</p>
            <p className="waiting-text">Waiting for confirmation...</p>
          </div>
        )}

        {error && (
          <div className="popup error show">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;