import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './RestaurantMenu.css';
import { FaFilter } from 'react-icons/fa';

function RestaurantMenu({ addToCart, openCart }) {
  const [restaurantData, setRestaurantData] = useState(null);
  const [processedMenu, setProcessedMenu] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('default');
  const { id } = useParams();
  const [popupVisible, setPopupVisible] = useState(false);
  const [error, setError] = useState(null);
  const [itemsAddedCount, setItemsAddedCount] = useState(0);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce function to limit the frequency of API calls
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Fetch restaurant data with debouncing
  const fetchRestaurant = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const backendUrl = process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '');
      const url = `${backendUrl}/api/restaurants/${id}`;

      const response = await axios.get(url, config);
      setRestaurantData(response.data);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setError(error.response?.data?.message || 'Error fetching restaurant details');
    }
  };

  // Debounced version of fetchRestaurant
  const debouncedFetchRestaurant = debounce(fetchRestaurant, 500);

  useEffect(() => {
    debouncedFetchRestaurant();
  }, [id]);

  // Process menu data after restaurant data is fetched
  useEffect(() => {
    if (restaurantData) {
      const categories = [...new Set(restaurantData.menu.map(item => item.category))];
      setAvailableCategories(['All', ...categories]);

      const updatedMenu = restaurantData.menu.map(item => {
        const sizes = Object.keys(item.sizes);
        return {
          ...item,
          selectedSize: sizes.length === 1 ? sizes[0] : 'Small',
          quantity: 1
        };
      });

      setProcessedMenu(updatedMenu);
    }
  }, [restaurantData]);

  const handleSizeChange = (itemId, size) => {
    setProcessedMenu(prevMenu => 
      prevMenu.map(menuItem => 
        menuItem._id === itemId
          ? { ...menuItem, selectedSize: size }
          : menuItem
      )
    );
  };

  const handleQuantityChange = (itemId, increment) => {
    setProcessedMenu(prevMenu => 
      prevMenu.map(menuItem => 
        menuItem._id === itemId
          ? { ...menuItem, quantity: Math.max((menuItem.quantity || 0) + increment, 0) }
          : menuItem
      )
    );
  };

  const handleAddToCart = (item) => {
    if (item.selectedSize) {
      const itemToCart = {
        id: item._id,
        name: item.itemName,
        price: item.sizes[item.selectedSize],
        quantity: item.quantity || 1,
        size: item.selectedSize,
        restaurantId: id,
        restaurantName: restaurantData.name,
      };

      addToCart(itemToCart);
      handleQuantityChange(item._id, -item.quantity);

      setItemsAddedCount(prevCount => {
        const newCount = prevCount + 1;
        if (newCount % 3 === 0) {
          openCart();
        }
        return newCount;
      });

      setPopupVisible(true);
      setTimeout(() => setPopupVisible(false), 3000);
    } else {
      alert('Please select a size before adding to cart.');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const filteredAndSortedMenu = React.useMemo(() => {
    let filtered = processedMenu.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      if (sortOption === 'priceLowToHigh') {
        return a.sizes[a.selectedSize] - b.sizes[b.selectedSize];
      } else if (sortOption === 'priceHighToLow') {
        return b.sizes[b.selectedSize] - a.sizes[a.selectedSize];
      } else if (sortOption === 'popularity') {
        return b.popularity - a.popularity;
      }
      return 0;
    });
  }, [processedMenu, searchQuery, selectedCategory, sortOption]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!restaurantData || !processedMenu.length) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="restaurant-menu-page">
      <h2 className="restaurant-name">{restaurantData.name}</h2>
      {restaurantData.image && (
        <img
          src={restaurantData.image}
          alt={restaurantData.name}
          className="restaurant-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/api/placeholder/400/300';
          }}
        />
      )}
      <p className="restaurant-address">{restaurantData.address}</p>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for items..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
        <button className="filter-icon" onClick={() => setShowFilters(!showFilters)}>
          <FaFilter />
        </button>
      </div>

      {showFilters && (
        <div className="filters">
          <label htmlFor="category">Category:</label>
          <select id="category" value={selectedCategory} onChange={handleCategoryChange}>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <label htmlFor="sort">Sort by:</label>
          <select id="sort" value={sortOption} onChange={handleSortChange}>
            <option value="default">Default</option>
            <option value="priceLowToHigh">Price: Low to High</option>
            <option value="priceHighToLow">Price: High to Low</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      )}

      <h3>Menu:</h3>
      <div className="menu-list">
        {filteredAndSortedMenu.length > 0 ? (
          filteredAndSortedMenu.map((item) => (
            <div key={item._id} className="menu-card">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.itemName}
                  className="menu-item-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/api/placeholder/400/300';
                  }}
                />
              )}
              <h4>{item.itemName}</h4>
              <p>₹{item.sizes[item.selectedSize] || Object.values(item.sizes)[0]}</p>

              <div className="dropdown-selector">
                <label htmlFor={`size-${item._id}`}>Size:</label>
                <select
                  id={`size-${item._id}`}
                  value={item.selectedSize || ''}
                  onChange={(e) => handleSizeChange(item._id, e.target.value)}
                >
                  {Object.keys(item.sizes).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quantity-counter">
                <button
                  className="quantity-btn"
                  disabled={!item.quantity || item.quantity <= 0}
                  onClick={() => handleQuantityChange(item._id, -1)}
                >
                  -
                </button>
                <input
                  type="text"
                  value={item.quantity || 0}
                  readOnly
                  className="quantity-input"
                />
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(item._id, 1)}
                >
                  +
                </button>
              </div>
              <div className="add-to-cart-container">
                <button
                  className="add-to-cart"
                  onClick={() => handleAddToCart(item)}
                  disabled={!item.quantity || item.quantity <= 0}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-items">No menu items found</p>
        )}
      </div>

      {popupVisible && (
        <div className="popup show">
          <p>Item added to cart!</p>
        </div>
      )}
    </div>
  );
}

export default RestaurantMenu;