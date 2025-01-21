import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Addresses = ({ authHeader }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await axios.get('/api/users/addresses', authHeader); // Replace with your addresses endpoint
        setAddresses(response.data);
      } catch (err) {
        setError('Failed to fetch addresses.');
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAddress = async () => {
    try {
      const response = await axios.post('/api/users/addresses', newAddress, authHeader); // Replace with your add address endpoint
      setAddresses([...addresses, response.data]);
      setNewAddress({ street: '', city: '', state: '', postalCode: '', country: '' });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add address.');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await axios.delete(`/api/users/addresses/${addressId}`, authHeader); // Replace with your delete address endpoint
      setAddresses(addresses.filter(address => address._id !== addressId));
    } catch (err) {
      setError('Failed to delete address.');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div>
      <h2>Addresses</h2>
      <button onClick={() => setShowAddForm(!showAddForm)}>Add New Address</button>

      {showAddForm && (
        <div>
          <h3>Add New Address</h3>
          <input type="text" name="street" placeholder="Street" value={newAddress.street} onChange={handleInputChange} />
          <input type="text" name="city" placeholder="City" value={newAddress.city} onChange={handleInputChange} />
          <input type="text" name="state" placeholder="State" value={newAddress.state} onChange={handleInputChange} />
          <input type="text" name="postalCode" placeholder="Postal Code" value={newAddress.postalCode} onChange={handleInputChange} />
          <input type="text" name="country" placeholder="Country" value={newAddress.country} onChange={handleInputChange} />
          <button onClick={handleAddAddress}>Save Address</button>
          <button onClick={() => setShowAddForm(false)}>Cancel</button>
        </div>
      )}

      <ul>
        {addresses.map(address => (
          <li key={address._id}>
            {address.street}, {address.city}, {address.state}, {address.postalCode}, {address.country}
            <button onClick={() => handleDeleteAddress(address._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Addresses;