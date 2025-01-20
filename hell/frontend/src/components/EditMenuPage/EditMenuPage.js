import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // Drag-and-drop functionality
import './EdiMenuPage.css'; // Ensure the CSS file is imported

axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL;

const EditMenuPage = () => {
  const { restaurantId } = useParams();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const navigate = useNavigate();

  // Ref to focus on the new item's input box
  const newItemInputRef = useRef(null);

  // Categories for the dropdown
  const categories = ['Beverages', 'Desserts', 'Main Course', 'Appetizers', 'Snacks'];

  // Fetch menu data from the backend
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const token = localStorage.getItem('userToken');
        const response = await axios.get(`/api/restaurants/${restaurantId}/menu`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Convert sizes from Map to object for consistency with RestaurantMenu.js
        const menuWithSizesAsObjects = response.data.menu.map((item) => ({
          ...item,
          sizes: item.sizes instanceof Map ? Object.fromEntries(item.sizes) : item.sizes,
        }));
        setMenu(menuWithSizesAsObjects || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
        setError('Failed to fetch menu. Please try again.');
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  // Add a new menu item
  const handleAddItem = () => {
    const newItem = { itemName: '', description: '', imageUrl: '', category: '', sizes: {} }; // Use object for sizes
    setMenu([...menu, newItem]);

    // Focus on the new item's input box after it's added
    setTimeout(() => {
      if (newItemInputRef.current) {
        newItemInputRef.current.focus();
      }
    }, 0);
  };

  // Remove a menu item
  const handleRemoveItem = (index) => {
    const isConfirmed = window.confirm('Are you sure you want to remove this item?');
    if (isConfirmed) {
      const newMenu = menu.filter((_, i) => i !== index);
      setMenu(newMenu);
    }
  };

  // Handle changes to input fields
  const handleChange = (index, field, value) => {
    const newMenu = [...menu];
    newMenu[index][field] = value;
    setMenu(newMenu);
  };

  // Handle changes to size and price
  const handleSizePriceChange = (index, oldSize, newSize, newPrice) => {
    if (isNaN(newPrice)) {
      alert('Price must be a number.');
      return;
    }
    const newMenu = [...menu];
    const sizes = { ...newMenu[index].sizes }; // Use object for sizes

    // If the size name is being changed, delete the old size and add the new one
    if (oldSize !== newSize) {
      delete sizes[oldSize]; // Remove the old size
    }
    sizes[newSize] = parseFloat(newPrice); // Add/update the new size and price

    newMenu[index].sizes = sizes; // Set the updated object back
    setMenu(newMenu);
  };

  // Add a new size and price
  const handleAddSize = (index, size, price) => {
    if (!size || !price) {
      alert('Please enter both size and price.');
      return;
    }
    if (isNaN(price)) {
      alert('Price must be a number.');
      return;
    }
    const newMenu = [...menu];
    const sizes = { ...newMenu[index].sizes }; // Use object for sizes
    sizes[size] = parseFloat(price); // Add the new size and price
    newMenu[index].sizes = sizes; // Set the updated object back
    setMenu(newMenu);
  };

  // Remove a size and price
  const handleRemoveSize = (index, size) => {
    const isConfirmed = window.confirm('Are you sure you want to remove this size?');
    if (isConfirmed) {
      const newMenu = [...menu];
      const sizes = { ...newMenu[index].sizes }; // Use object for sizes
      delete sizes[size]; // Remove the size
      newMenu[index].sizes = sizes; // Set the updated object back
      setMenu(newMenu);
    }
  };

  // Update a specific menu item
  const handleUpdateItem = async (index) => {
    try {
      const token = localStorage.getItem('userToken');
      const itemToUpdate = menu[index];
      await axios.put(`/api/restaurants/${restaurantId}/menu/${index}`, itemToUpdate, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Item updated successfully!');
    } catch (err) {
      console.error('Failed to update item:', err);
      alert('Failed to update item. Please try again.');
    }
  };

  // Save the entire menu
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.put(`/api/restaurants/${restaurantId}/menu`, { menu }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Menu updated successfully!');
      navigate(`/restaurant-panel`);
    } catch (err) {
      console.error('Failed to update menu:', err);
      alert('Failed to update menu. Please try again.');
    }
  };

  // Drag-and-drop functionality
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(menu);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMenu(items);
  };

  // Filter menu items based on search query
  const filteredMenu = menu.filter((item) =>
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="edit-menu-page">
      <h1>Edit Menu</h1>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <button className="add-item-button" onClick={handleAddItem}>
        Add Item
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="menu-items">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {filteredMenu.map((item, index) => (
                <Draggable key={index} draggableId={`item-${index}`} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="menu-item"
                    >
                      <h3>Item Details</h3>
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => handleChange(index, 'itemName', e.target.value)}
                        placeholder="Item Name (e.g., Vanilla Shake)"
                        ref={index === menu.length - 1 ? newItemInputRef : null} // Focus on the new item's input box
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) => handleChange(index, 'description', e.target.value)}
                        placeholder="Description"
                        rows={4}
                      />
                      <input
                        type="text"
                        value={item.imageUrl}
                        onChange={(e) => handleChange(index, 'imageUrl', e.target.value)}
                        placeholder="Image URL"
                      />
                      {item.imageUrl && (
                        <div className="image-preview">
                          <img src={item.imageUrl} alt="Preview" />
                        </div>
                      )}
                      <select
                        value={item.category}
                        onChange={(e) => handleChange(index, 'category', e.target.value)}
                      >
                        <option value="">Select Category</option>
                        {categories.map((category, catIndex) => (
                          <option key={catIndex} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>

                      {/* Sizes and Prices Table */}
                      <div className="sizes-section">
                        <h4>Sizes and Prices:</h4>
                        <table>
                          <thead>
                            <tr>
                              <th>Size</th>
                              <th>Price</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(item.sizes).map(([size, price], sizeIndex) => (
                              <tr key={sizeIndex}>
                                <td>
                                  <input
                                    type="text"
                                    value={size}
                                    onChange={(e) =>
                                      handleSizePriceChange(index, size, e.target.value, price)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={price}
                                    onChange={(e) =>
                                      handleSizePriceChange(index, size, size, e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <button onClick={() => handleRemoveSize(index, size)}>
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Add New Size */}
                        <div className="add-size">
                          <input
                            type="text"
                            placeholder="New Size"
                            id={`new-size-${index}`}
                            className="new-size-input"
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            id={`new-price-${index}`}
                            className="new-price-input"
                          />
                          <button
                            onClick={() => {
                              const newSize = document.getElementById(`new-size-${index}`).value;
                              const newPrice = document.getElementById(`new-price-${index}`).value;
                              handleAddSize(index, newSize, newPrice);
                              document.getElementById(`new-size-${index}`).value = '';
                              document.getElementById(`new-price-${index}`).value = '';
                            }}
                          >
                            Add Size
                          </button>
                        </div>
                      </div>

                      {/* Update Item Button */}
                      <button
                        className="update-item"
                        onClick={() => handleUpdateItem(index)}
                      >
                        Update Item
                      </button>

                      {/* Remove Item Button */}
                      <button
                        className="remove-item"
                        onClick={() => handleRemoveItem(index)}
                      >
                        Remove Item
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button className="save-menu" onClick={handleSave}>
        Save Menu
      </button>
    </div>
  );
};

export default EditMenuPage;