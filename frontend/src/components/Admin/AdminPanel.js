import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css'; // Import the scoped CSS
import { FaFilter, FaSort } from 'react-icons/fa'; // Import filter and sort icons

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [newRole, setNewRole] = useState({});
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [newRestaurantAddress, setNewRestaurantAddress] = useState('');
  const [newAssociation, setNewAssociation] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showOrders, setShowOrders] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [filterRole, setFilterRole] = useState('all'); // State for role filter
  const [showFilterDropdown, setShowFilterDropdown] = useState(false); // State for role filter dropdown visibility
  const [filterRestaurant, setFilterRestaurant] = useState('all'); // State for restaurant filter
  const [showRestaurantFilterDropdown, setShowRestaurantFilterDropdown] = useState(false); // State for restaurant filter dropdown visibility
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false); // State for date filter dropdown visibility
  const [showFullDetails, setShowFullDetails] = useState({}); // State to toggle full details for each order
  const [sortByDate, setSortByDate] = useState('newest'); // State for sorting orders by date
  const [dateFilter, setDateFilter] = useState('all'); // State for date filter (last month, last 6 months, etc.)
  const [customStartDate, setCustomStartDate] = useState(''); // State for custom start date
  const [customEndDate, setCustomEndDate] = useState(''); // State for custom end date

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL + '/api';

  const getHeaders = () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const handleResponse = async (response) => {
    if (response.status === 401) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(typeof data === 'object' ? data.message : data || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = getHeaders();
      const [usersResponse, restaurantsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/users`, {
          method: 'GET',
          headers,
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/restaurants/admin/restaurants`, {
          method: 'GET',
          headers,
          credentials: 'include',
        }),
      ]);

      const [userData, restaurantData] = await Promise.all([
        handleResponse(usersResponse),
        handleResponse(restaurantsResponse),
      ]);

      setUsers(userData);
      setRestaurants(restaurantData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = getHeaders();
      const response = await fetch(`${API_BASE_URL}/orders/all`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const data = await handleResponse(response);
      console.log('API Response:', data); // Log the API response for debugging
      setAllOrders(data.orders);
      setShowOrders(true);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Error fetching orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminControls = () => {
    setShowOrders(false); // Hide orders table and show the initial admin panel
  };

  const handleFilterChange = (role) => {
    setFilterRole(role); // Update the filter role
    setShowFilterDropdown(false); // Hide the dropdown after selection
  };

  const handleRestaurantFilterChange = (restaurantName) => {
    setFilterRestaurant(restaurantName); // Update the filter restaurant
    setShowRestaurantFilterDropdown(false); // Hide the dropdown after selection
  };

  const handleSortByDate = (sortType) => {
    setSortByDate(sortType); // Update the sort type
    setShowDateFilterDropdown(false); // Hide the dropdown after selection
  };

  const handleDateFilter = (filterType) => {
    setDateFilter(filterType);
    setShowDateFilterDropdown(false); // Hide the dropdown after selection
    if (filterType !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const toggleFullDetails = (orderId) => {
    setShowFullDetails((prev) => ({
      ...prev,
      [orderId]: !prev[orderId], // Toggle full details for the specific order
    }));
  };

  const filteredUsers = filterRole === 'all'
    ? users
    : users.filter(user => user.role === filterRole); // Filter users based on selected role

  const filteredOrders = filterRestaurant === 'all'
    ? allOrders
    : allOrders.filter(order => order.restaurant?.name === filterRestaurant); // Filter orders based on selected restaurant

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortByDate === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const dateFilteredOrders = sortedOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const currentDate = new Date();

    switch (dateFilter) {
      case 'lastMonth':
        return orderDate >= new Date(currentDate.setMonth(currentDate.getMonth() - 1));
      case 'last6Months':
        return orderDate >= new Date(currentDate.setMonth(currentDate.getMonth() - 6));
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          return orderDate >= startDate && orderDate <= endDate;
        }
        return true; // If no custom date range is selected, show all orders
      default:
        return true;
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleSelect = (userId, role) => {
    setError('');
    setSuccessMessage('');
    setNewRole((prev) => ({ ...prev, [userId]: role }));
    if (role !== 'restaurant') {
      setNewAssociation((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setNewRestaurantName('');
      setNewRestaurantAddress('');
    }
  };

  const handleRoleChange = async (userId) => {
    try {
      setError('');
      setSuccessMessage('');

      const role = newRole[userId];
      if (!role) {
        setError('Please select a role');
        return;
      }

      const data = {
        role,
        restaurantId: role === 'restaurant' && newAssociation[userId] ? newAssociation[userId] : undefined,
        newRestaurantData:
          role === 'restaurant' && !newAssociation[userId]
            ? {
                name: newRestaurantName,
                address: newRestaurantAddress,
              }
            : undefined,
      };

      if (role === 'restaurant' && !newAssociation[userId]) {
        if (!newRestaurantName) {
          setError('Please provide restaurant name');
          return;
        }
        if (!newRestaurantAddress) {
          setError('Please provide restaurant address');
          return;
        }
      }

      const response = await fetch(`${API_BASE_URL}/users/assign-role/${userId}`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await handleResponse(response);
      console.log('Role update response:', result);

      await fetchData();
      setSuccessMessage('Role updated successfully');

      setNewRole((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setNewAssociation((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setNewRestaurantName('');
      setNewRestaurantAddress('');
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update role. Please try again.');
    }
  };

  return (
    <div className="mafia-admin-panel">
      <h1>Admin Panel</h1>
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="button-container">
        <button onClick={fetchAllOrders} className="orders-button">
          Orders
        </button>
        {showOrders && (
          <button onClick={handleAdminControls} className="admin-controls-button">
            Admin Controls
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : showOrders ? (
        <div className="orders-table">
          <h2>All Orders</h2>
          <div className="filter-container">
            {/* Restaurant Filter */}
            <div className="filter-icon" onClick={() => setShowRestaurantFilterDropdown(!showRestaurantFilterDropdown)}>
              <FaFilter />
              {showRestaurantFilterDropdown && (
                <div className="filter-dropdown">
                  <div onClick={() => handleRestaurantFilterChange('all')}>All Restaurants</div>
                  {restaurants.map((restaurant) => (
                    <div key={restaurant._id} onClick={() => handleRestaurantFilterChange(restaurant.name)}>
                      {restaurant.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Sorting */}
            <div className="sort-icon" onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}>
              <FaSort />
              {showDateFilterDropdown && (
                <div className="filter-dropdown">
                  <div onClick={() => handleSortByDate('newest')}>Newest First</div>
                  <div onClick={() => handleSortByDate('oldest')}>Oldest First</div>
                  <div onClick={() => handleDateFilter('lastMonth')}>Last Month</div>
                  <div onClick={() => handleDateFilter('last6Months')}>Last 6 Months</div>
                  <div onClick={() => handleDateFilter('custom')}>Custom Date Range</div>
                  {dateFilter === 'custom' && (
                    <div className="custom-date-range">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="date-input"
                      />
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="date-input"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Customer</th>
                <th>Ordered At</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dateFilteredOrders.map((order) => (
                <React.Fragment key={order._id}>
                  <tr>
                    <td>{order.restaurant?.name || 'N/A'}</td>
                    <td>{order.customer?.username || 'N/A'}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>₹{order.totalAmount?.toFixed(2) || '0.00'}</td>
                    <td>{order.orderStatus || 'Unknown'}</td>
                    <td>
                      <button onClick={() => toggleFullDetails(order._id)} className="details-button">
                        {showFullDetails[order._id] ? 'Hide Details' : 'See Full Details'}
                      </button>
                    </td>
                  </tr>
                  {showFullDetails[order._id] && (
                    <tr>
                      <td colSpan="6">
                        <div className="full-details">
                          {order.customer ? (
                            <>
                              <p><strong>Mobile Number:</strong> {order.customer.mobileNumber || 'N/A'}</p>
                              <p><strong>Address:</strong> {order.customer.address || 'N/A'}</p>
                            </>
                          ) : (
                            <p><strong>No customer data available.</strong></p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="filter-container">
            <div className="filter-icon" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <FaFilter />
              {showFilterDropdown && (
                <div className="filter-dropdown">
                  <div onClick={() => handleFilterChange('all')}>All Roles</div>
                  <div onClick={() => handleFilterChange('admin')}>Admin</div>
                  <div onClick={() => handleFilterChange('user')}>User</div>
                  <div onClick={() => handleFilterChange('restaurant')}>Restaurant</div>
                </div>
              )}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Mobile Number</th>
                <th>Current Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>{user.username}</td>
                  <td>{user.mobileNumber}</td>
                  <td>
                    {user.role}
                    {user.restaurant && ` / ${user.restaurant.name || 'Unassigned'}`}
                  </td>
                  <td className="actions-cell">
                    <select
                      value={newRole[user._id] || ''}
                      onChange={(e) => handleRoleSelect(user._id, e.target.value)}
                      className="role-select"
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="user">User</option>
                    </select>

                    {newRole[user._id] === 'restaurant' && (
                      <>
                        <select
                          value={newAssociation[user._id] || ''}
                          onChange={(e) =>
                            setNewAssociation((prev) => ({
                              ...prev,
                              [user._id]: e.target.value,
                            }))
                          }
                          className="restaurant-select"
                        >
                          <option value="">Select Restaurant</option>
                          {restaurants
                            .filter((r) => !r.owner || r.owner?._id === user._id)
                            .map((r) => (
                              <option key={r._id} value={r._id}>
                                {r.name || 'Unnamed Restaurant'}
                              </option>
                            ))}
                        </select>

                        {!newAssociation[user._id] && (
                          <>
                            <input
                              type="text"
                              placeholder="New Restaurant Name"
                              value={newRestaurantName}
                              onChange={(e) => setNewRestaurantName(e.target.value)}
                              className="input-field"
                            />
                            <input
                              type="text"
                              placeholder="Restaurant Address"
                              value={newRestaurantAddress}
                              onChange={(e) => setNewRestaurantAddress(e.target.value)}
                              className="input-field"
                            />
                          </>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => handleRoleChange(user._id)}
                      disabled={
                        !newRole[user._id] ||
                        (newRole[user._id] === 'restaurant' &&
                          !newAssociation[user._id] &&
                          (!newRestaurantName || !newRestaurantAddress)) ||
                        (newRole[user._id] === 'restaurant' &&
                          newAssociation[user._id] === '' &&
                          !newRestaurantName &&
                          !newRestaurantAddress)
                      }
                      className="update-button"
                    >
                      Update Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;