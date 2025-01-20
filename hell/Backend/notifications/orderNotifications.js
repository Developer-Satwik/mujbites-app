const admin = require('../config/firebaseAdmin'); // Import Firebase Admin from config folder
const Token = require('../models/token');

const NOTIFICATION_TEMPLATES = {
  ORDER_PLACED: {
    title: 'Order Placed Successfully!',
    body: (restaurantName) =>
      `Your order has been placed successfully! We're now waiting for confirmation from ${restaurantName}. Stay tuned!`,
  },
  ORDER_CONFIRMED: {
    title: 'Order Confirmed!',
    body: () =>
      'Your order has been confirmed and will be delivered soon! Keep ordering from us for more delicious meals!',
  },
  ORDER_DELIVERED: {
    title: 'Order Delivered!',
    body: () =>
      'Your order has been delivered! We hope you enjoy your meal. Thank you for choosing us, and we look forward to serving you again soon!',
  },
  NEW_ORDER: {
    title: 'New Order Received!',
    body: (restaurantName) =>
      `You have a new order at ${restaurantName}. Check it out now!`,
  },
};

/**
 * Sends a notification to a user or restaurant owner.
 * @param {string} userId - The ID of the user or restaurant owner.
 * @param {string} notificationType - The type of notification (e.g., 'ORDER_PLACED', 'NEW_ORDER').
 * @param {Object} templateData - Additional data for the notification template (e.g., restaurantName).
 * @returns {Object} - Result of the notification sending process.
 */
async function sendOrderNotification(userId, notificationType, templateData = {}) {
  try {
    // Fetch active tokens for the user or restaurant owner
    const userTokens = await Token.find({
      userId: userId,
      isActive: true,
    });

    if (!userTokens.length) {
      console.log('No active tokens found for user:', userId);
      return {
        success: false,
        error: 'No active tokens found for the user.',
      };
    }

    // Get the notification template
    const template = NOTIFICATION_TEMPLATES[notificationType];
    if (!template) {
      throw new Error(`Invalid notification type: ${notificationType}`);
    }

    // Construct the notification message
    const message = {
      data: {
        title: template.title,
        body: template.body(templateData.restaurantName),
        ...templateData, // Include additional data for the notification
        notificationType, // Include the notification type
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Required for background notifications
      },
      tokens: userTokens.map((t) => t.token), // Array of tokens
    };

    // Validate the message object
    if (!message || !message.tokens || message.tokens.length === 0) {
      throw new Error('Invalid message or no tokens provided');
    }

    // Send the multicast message
    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle failed tokens
    const failedTokens = [];
    response.responses.forEach((result, idx) => {
      if (!result.success) {
        failedTokens.push(userTokens[idx].token);
      }
    });

    // Remove failed tokens from the database
    if (failedTokens.length > 0) {
      await Token.deleteMany({ token: { $in: failedTokens } });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error('Error sending notification:', {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sends a background notification to a user or restaurant owner.
 * @param {string} userId - The ID of the user or restaurant owner.
 * @param {string} notificationType - The type of notification (e.g., 'ORDER_PLACED', 'NEW_ORDER').
 * @param {Object} templateData - Additional data for the notification template (e.g., restaurantName).
 * @returns {Object} - Result of the notification sending process.
 */
async function sendBackgroundNotification(userId, notificationType, templateData = {}) {
  try {
    // Fetch active tokens for the user or restaurant owner
    const userTokens = await Token.find({
      userId: userId,
      isActive: true,
    });

    if (!userTokens.length) {
      console.log('No active tokens found for user:', userId);
      return {
        success: false,
        error: 'No active tokens found for the user.',
      };
    }

    // Get the notification template
    const template = NOTIFICATION_TEMPLATES[notificationType];
    if (!template) {
      throw new Error(`Invalid notification type: ${notificationType}`);
    }

    // Construct the background notification message
    const message = {
      data: {
        title: template.title,
        body: template.body(templateData.restaurantName),
        ...templateData, // Include additional data for the notification
        notificationType, // Include the notification type
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Required for background notifications
      },
      tokens: userTokens.map((t) => t.token), // Array of tokens
    };

    // Validate the message object
    if (!message || !message.tokens || message.tokens.length === 0) {
      throw new Error('Invalid message or no tokens provided');
    }

    // Send the multicast message
    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle failed tokens
    const failedTokens = [];
    response.responses.forEach((result, idx) => {
      if (!result.success) {
        failedTokens.push(userTokens[idx].token);
      }
    });

    // Remove failed tokens from the database
    if (failedTokens.length > 0) {
      await Token.deleteMany({ token: { $in: failedTokens } });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error('Error sending background notification:', {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendOrderNotification,
  sendBackgroundNotification,
};