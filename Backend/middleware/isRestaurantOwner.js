const User = require('../models/user');
const Restaurant = require('../models/restaurantModel');

const isRestaurantOwner = async (req, res, next) => {
  try {
    // Check if the user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    // Fetch the user from the database
    const user = await User.findById(req.user.userId);

    // Check if the user exists and has the 'restaurant' role
    if (!user || user.role !== 'restaurant') {
      return res.status(403).json({ message: 'Forbidden: Access denied. User is not a restaurant owner.' });
    }

    // If the request involves a specific restaurant, validate ownership
    if (req.params.restaurantId) {
      const restaurant = await Restaurant.findById(req.params.restaurantId).populate('owner');

      // Check if the restaurant exists
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // Check if the authenticated user is the owner of the restaurant
      if (restaurant.owner._id.toString() !== user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not own this restaurant.' });
      }

      // Attach the restaurant to the request object for use in subsequent middleware or routes
      req.restaurant = restaurant;
    }

    // Attach the user to the request object
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error in isRestaurantOwner middleware:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = isRestaurantOwner;