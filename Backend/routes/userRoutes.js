const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/user');
const Restaurant = require('../models/restaurantModel');
const Order = require('../models/orders');
const authenticateToken = require('../middleware/authMiddleware');

// --- Helper Function ---
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Only admins can perform this action' });
  }
};

// --- Validation Rules ---
const loginValidationRules = [
  body('mobileNumber')
    .trim()
    .isLength({ min: 10, max: 10 })
    .withMessage('Mobile number must be 10 digits')
    .isNumeric()
    .withMessage('Mobile number must contain only numbers'),
  body('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// --- User Authentication Routes ---

// POST /api/users/register (Signup)
router.post('/register', async (req, res) => {
  try {
    const { username, mobileNumber, password } = req.body;

    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this mobile number' });
    }

    const user = new User({
      username,
      mobileNumber,
      password,
      role: 'user',
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '72h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/users/login
router.post('/login', loginValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { mobileNumber, password } = req.body;

  try {
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this mobile number' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '72h' }
    );

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        mobileNumber: user.mobileNumber,
      },
      message: 'Login successful!',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('restaurant');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign Role (Admin only)
router.post('/assign-role/:userId', authenticateToken, isAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.params;
    const { role, restaurantId, newRestaurantData } = req.body;

    if (!userId || !role) {
      throw new Error('User ID and role are required');
    }

    if (!['admin', 'restaurant', 'user'].includes(role)) {
      throw new Error('Invalid role specified. Role must be one of: admin, restaurant, user.');
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    if (role === 'restaurant') {
      let restaurant;

      if (restaurantId) {
        restaurant = await Restaurant.findById(restaurantId).session(session);
        if (!restaurant) {
          throw new Error('Restaurant not found');
        }
        if (restaurant.owner && restaurant.owner.toString() !== userId) {
          throw new Error('Restaurant already has an owner');
        }
      } else if (newRestaurantData) {
        const { name, address } = newRestaurantData;
        if (!name) {
          return res.status(400).json({ message: 'Restaurant name is required' });
        }
        restaurant = new Restaurant({
          ...newRestaurantData,
          owner: user._id,
          isActive: true
        });
        await restaurant.save({ session });
      } else {
        throw new Error('Restaurant ID or new restaurant data is required for restaurant role');
      }

      if (user.restaurant) {
        const prevRestaurant = await Restaurant.findById(user.restaurant).session(session);
        if (prevRestaurant) {
          prevRestaurant.owner = null;
          await prevRestaurant.save({ session });
        }
      }

      restaurant.owner = user._id;
      await restaurant.save({ session });
      user.restaurant = restaurant._id;
    } else {
      if (user.role === 'restaurant' && user.restaurant) {
        const oldRestaurant = await Restaurant.findById(user.restaurant).session(session);
        if (oldRestaurant) {
          oldRestaurant.owner = null;
          await oldRestaurant.save({ session });
        }
        user.restaurant = null;
      }
    }

    user.role = role;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    const updatedUser = await User.findById(userId).populate('restaurant');

    return res.json({
      message: 'Role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error("Assign role error:", error);
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      message: error.message || 'Error updating user role'
    });
  }
});

// Get All Users (Admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}).populate('restaurant');
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get User by ID (Admin only)
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('restaurant');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile update
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { username, mobileNumber, address, oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (username) user.username = username;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (address) user.address = address;

    if (oldPassword && newPassword) {
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect." });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();
    res.status(200).json({ message: "Profile updated successfully." });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Update User (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('restaurant');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete User (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'restaurant' && user.restaurant) {
      const restaurant = await Restaurant.findById(user.restaurant);
      if (restaurant) {
        restaurant.owner = null;
        await restaurant.save();
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update User Address
router.patch('/profile/address', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { address } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { address },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Address updated successfully', user });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch Orders for a User
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ userId }).populate('restaurant items.menuItem');
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Order
router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const { restaurant, items, totalAmount, address } = req.body;
    const userId = req.user.userId;

    if (!restaurant || !items || !totalAmount || !address) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items must be a non-empty array' });
    }

    const order = new Order({
      restaurant,
      items,
      totalAmount,
      address,
      userId,
      orderStatus: 'Placed',
    });

    await order.save();

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;