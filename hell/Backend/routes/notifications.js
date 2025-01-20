const express = require('express');
const router = express.Router();
const Notification = require('../models/notification'); // Notification model
const Restaurant = require('../models/restaurantModel'); // Restaurant model
const authenticateToken = require('../middleware/authMiddleware');
const { sendNotification } = require('../notifications/notifications'); // Firebase notification utility
const { sendOrderNotification } = require('../notifications/orderNotifications'); // Order notification utility

/**
 * @route   GET /api/notifications
 * @desc    Fetch notifications for the authenticated user
 * @access  Private
 * @param   {Object} req - The request object
 * @param   {Object} res - The response object
 * @returns {Object} - List of notifications or error message
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch notifications for the user
    const notifications = await Notification.find({ userId })
      .sort({ timestamp: -1 }) // Sort by timestamp (newest first)
      .limit(50); // Limit to 50 notifications

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Server error while fetching notifications.' });
  }
});

/**
 * @route   POST /api/notifications/restaurant
 * @desc    Send a notification to a restaurant (e.g., when an order is placed)
 * @access  Private
 * @param   {Object} req - The request object
 * @param   {Object} res - The response object
 * @returns {Object} - Success or error message
 */
router.post('/restaurant', authenticateToken, async (req, res) => {
  try {
    const { restaurantId, message, orderId } = req.body;

    // Validate input
    if (!restaurantId || !message || !orderId) {
      return res.status(400).json({ message: 'Restaurant ID, message, and order ID are required.' });
    }

    // Fetch the restaurant owner's user ID
    const restaurant = await Restaurant.findById(restaurantId).populate('owner');
    if (!restaurant || !restaurant.owner) {
      return res.status(404).json({ message: 'Restaurant or owner not found.' });
    }

    const restaurantOwnerId = restaurant.owner._id;

    // Create a new notification for the restaurant owner
    const notification = new Notification({
      userId: restaurantOwnerId,
      message,
      timestamp: new Date(),
      orderId, // Store the order ID for reference
    });

    await notification.save();

    // Send a real-time push notification using Firebase
    const notificationResult = await sendOrderNotification(
      restaurantOwnerId,
      'NEW_ORDER', // Notification type for new orders
      { restaurantName: restaurant.name, orderId } // Additional data for the notification
    );

    if (!notificationResult.success) {
      console.error('Failed to send Firebase notification:', notificationResult.error);
      return res.status(500).json({ message: 'Failed to send real-time notification.' });
    }

    res.status(200).json({ message: 'Notification sent successfully.', notification });
  } catch (error) {
    console.error('Error sending notification to restaurant:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Server error while sending notification.', error: error.message });
  }
});

/**
 * @route   POST /api/notifications/mark-read
 * @desc    Mark a notification as read
 * @access  Private
 * @param   {Object} req - The request object
 * @param   {Object} res - The response object
 * @returns {Object} - Success or error message
 */
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.body;

    // Validate input
    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required.' });
    }

    // Mark the notification as read
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('Error marking notification as read:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Server error while marking notification as read.' });
  }
});

module.exports = router;