const admin = require('../config/firebaseAdmin'); // Import Firebase Admin from config folder
const Token = require('../models/token');

/**
 * Sends a notification to a list of tokens.
 * @param {string[]} tokens - Array of FCM tokens.
 * @param {string} title - Title of the notification.
 * @param {string} body - Body of the notification.
 * @param {Object} data - Additional data to include in the notification.
 * @returns {Object} - Result of the notification sending process.
 */
const sendNotification = async (tokens, title, body, data = {}) => {
  const message = {
    data: {
      title,
      body,
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // Required for background notifications
    },
    tokens: Array.isArray(tokens) ? tokens : [tokens], // Ensure tokens is an array
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('Notification sent successfully:', response);

    // Handle failed tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
      }
    });

    // Remove failed tokens from database
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
};

/**
 * Sends a background notification to a list of tokens.
 * @param {string[]} tokens - Array of FCM tokens.
 * @param {string} title - Title of the notification.
 * @param {string} body - Body of the notification.
 * @param {Object} data - Additional data to include in the notification.
 * @returns {Object} - Result of the notification sending process.
 */
const sendBackgroundNotification = async (tokens, title, body, data = {}) => {
  const message = {
    data: {
      title,
      body,
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // Required for background notifications
    },
    tokens: Array.isArray(tokens) ? tokens : [tokens], // Ensure tokens is an array
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('Background notification sent successfully:', response);

    // Handle failed tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
      }
    });

    // Remove failed tokens from database
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
};

/**
 * Sends a notification to all registered tokens.
 * @param {string} title - Title of the notification.
 * @param {string} body - Body of the notification.
 * @param {Object} data - Additional data to include in the notification.
 * @returns {Object} - Result of the notification sending process.
 */
const sendToAllUsers = async (title, body, data = {}) => {
  try {
    const tokens = await Token.find({ isActive: true }).select('token');
    const tokenStrings = tokens.map((t) => t.token);

    if (tokenStrings.length === 0) {
      return { success: false, error: 'No active tokens found' };
    }

    return await sendNotification(tokenStrings, title, body, data);
  } catch (error) {
    console.error('Error sending to all users:', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
};

/**
 * Sends a notification to specific users.
 * @param {string[]} userIds - Array of user IDs.
 * @param {string} title - Title of the notification.
 * @param {string} body - Body of the notification.
 * @param {Object} data - Additional data to include in the notification.
 * @returns {Object} - Result of the notification sending process.
 */
const sendToUsers = async (userIds, title, body, data = {}) => {
  try {
    const tokens = await Token.find({
      userId: { $in: userIds },
      isActive: true,
    }).select('token');

    const tokenStrings = tokens.map((t) => t.token);

    if (tokenStrings.length === 0) {
      return { success: false, error: 'No active tokens found for specified users' };
    }

    return await sendNotification(tokenStrings, title, body, data);
  } catch (error) {
    console.error('Error sending to specific users:', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendBackgroundNotification,
  sendToAllUsers,
  sendToUsers,
};