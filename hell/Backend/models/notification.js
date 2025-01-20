const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function () {
      return !this.restaurantId; // userId is required if restaurantId is not provided
    },
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function () {
      return !this.userId; // restaurantId is required if userId is not provided
    },
  },
  message: {
    type: String,
    required: true,
  },
  notificationType: {
    type: String,
    enum: ['order', 'general', 'promotion', 'system'], // Types of notifications
    default: 'general',
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: function () {
      return this.notificationType === 'order'; // orderId is required for order-related notifications
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Flexible field for additional data
    default: {},
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Indexes for faster queries
notificationSchema.index({ userId: 1, read: 1 }); // Index for fetching unread notifications by user
notificationSchema.index({ restaurantId: 1, read: 1 }); // Index for fetching unread notifications by restaurant
notificationSchema.index({ timestamp: -1 }); // Index for sorting notifications by timestamp

// Static method to fetch unread notifications for a user or restaurant
notificationSchema.statics.findUnreadNotifications = function (userId, restaurantId) {
  const query = userId ? { userId } : { restaurantId };
  return this.find({ ...query, read: false })
    .sort({ timestamp: -1 })
    .limit(50); // Limit to 50 unread notifications
};

// Static method to mark all notifications as read for a user or restaurant
notificationSchema.statics.markAllAsRead = function (userId, restaurantId) {
  const query = userId ? { userId } : { restaurantId };
  return this.updateMany({ ...query, read: false }, { read: true });
};

// Static method to create a notification
notificationSchema.statics.createNotification = function (data) {
  const { userId, restaurantId, message, notificationType, orderId, metadata } = data;

  // Validate required fields based on notification type
  if (notificationType === 'order' && !orderId) {
    throw new Error('orderId is required for order-related notifications');
  }

  return this.create({
    userId,
    restaurantId,
    message,
    notificationType,
    orderId,
    metadata,
  });
};

module.exports = mongoose.model('Notification', notificationSchema);