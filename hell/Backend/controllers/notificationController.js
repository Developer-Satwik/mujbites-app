const Notification = require('../models/notification');
const { sendNotification } = require('../notifications/notifications');
const { sendOrderNotification } = require('../notifications/orderNotifications');

/**
 * @desc    Fetch all notifications for a user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId; // Get the user ID from the authenticated request

    // Fetch notifications for the user, sorted by timestamp (newest first)
    const notifications = await Notification.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50); // Limit to 50 notifications

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Server error while fetching notifications.' });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.userId; // Ensure the notification belongs to the authenticated user

    // Find the notification and update its read status
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId }, // Ensure the notification belongs to the user
      { read: true },
      { new: true } // Return the updated notification
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized.' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Server error while marking notification as read.' });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.userId; // Ensure the notification belongs to the authenticated user

    // Find and delete the notification
    const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Error deleting notification:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Server error while deleting notification.' });
  }
};

/**
 * @desc    Send a notification to a user
 * @route   POST /api/notifications/send
 * @access  Private (Admin or Restaurant Owner)
 */
const sendUserNotification = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    // Validate input
    if (!userId || !title || !body) {
      return res.status(400).json({ success: false, message: 'User ID, title, and body are required.' });
    }

    // Send the notification using Firebase
    const result = await sendNotification(userId, title, body, data);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to send notification.', error: result.error });
    }

    res.status(200).json({ success: true, message: 'Notification sent successfully.', result });
  } catch (error) {
    console.error('Error sending notification:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Server error while sending notification.' });
  }
};

/**
 * @desc    Send an order-related notification
 * @route   POST /api/notifications/order
 * @access  Private (Admin or Restaurant Owner)
 */
const sendOrderNotificationController = async (req, res) => {
  try {
    const { userId, notificationType, templateData } = req.body;

    // Validate input
    if (!userId || !notificationType) {
      return res.status(400).json({ success: false, message: 'User ID and notification type are required.' });
    }

    // Send the order notification
    const result = await sendOrderNotification(userId, notificationType, templateData);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to send order notification.', error: result.error });
    }

    res.status(200).json({ success: true, message: 'Order notification sent successfully.', result });
  } catch (error) {
    console.error('Error sending order notification:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Server error while sending order notification.' });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  sendUserNotification,
  sendOrderNotificationController,
};