import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Home.css';
import placeholderImage from './placeholder.jpg'; // Import the fallback placeholder image

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Retrieve the backend URL from the environment variable
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Function to fetch restaurants
  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/restaurants`);
      const openRestaurants = response.data.filter((restaurant) => restaurant.isActive);
      // Sort the restaurants so "chaizza" appears first
      const sortedRestaurants = openRestaurants.sort((a, b) => {
        if (a.name.toLowerCase() === "chaizza") return -1; // Bring "chaizza" to the top
        if (b.name.toLowerCase() === "chaizza") return 1; // Push other items down
        return 0; // Keep the rest unchanged
      });
      setRestaurants(sortedRestaurants);
      setError(null);
    } catch (err) {
      console.error('Error fetching restaurants:', err.response ? err.response.data : err.message);
      setError('Error fetching restaurant data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch restaurants on component mount
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Auto-refresh every 5 minutes (300,000 milliseconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchRestaurants();
    }, 300000); // 5 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle search input change
  const handleSearchChange = (event) => {
    console.log("Search Query:", event.target.value); // Debugging: Log the input value
    setSearchQuery(event.target.value);
  };

  // Apply filter only if searchQuery is not empty
  const filteredRestaurants = searchQuery
    ? restaurants.filter((restaurant) =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : restaurants;

  console.log("Filtered Restaurants:", filteredRestaurants); // Debugging: Log the filtered results

  return (
    <div className="home-page">
      {/* Updated Search Bar */}
      <div className="search-container">
        <div className="search-group">
          <svg
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="search-icon"
          >
            <path
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search restaurants by name or location..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div>Loading restaurants...</div>
      ) : (
        <div className="restaurant-list">
          {filteredRestaurants.length === 0 ? (
            <div className="no-restaurants">No restaurants available</div>
          ) : (
            filteredRestaurants.map((restaurant, index) => (
              <Link
                to={`/restaurant/${restaurant._id}`}
                key={restaurant._id}
                className="restaurant-card"
                style={{ animationDelay: `${index * 0.1}s` }} // Staggered animation delay
              >
                <img
                  src={restaurant.imageUrl || placeholderImage} // Use restaurant.imageUrl or fallback to placeholder
                  alt={restaurant.name}
                  onError={(e) => {
                    e.target.src = placeholderImage; // Fallback if imageUrl is broken
                  }}
                />
                <div className="restaurant-info">
                  <h3>{restaurant.name}</h3>
                  <p>{restaurant.address}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Home;