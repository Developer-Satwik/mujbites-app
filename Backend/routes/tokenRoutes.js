const express = require('express');
const router = express.Router();
const Token = require('../models/token');
const mongoose = require('mongoose');

/**
 * @route   POST /api/tokens
 * @desc    Save a new token to the database or update an existing token's expiration
 * @access  Public
 * @param   {Object} req - The request object containing the token, userId, restaurantId, deviceId, and platform in the body
 * @param   {Object} res - The response object
 * @returns {Object} - Success or error message
 */
router.post('/', async (req, res) => {
  console.log('Token route accessed with body:', req.body);

  const { token, userId, restaurantId, deviceId, platform = 'web' } = req.body;

  // Validate token
  if (!token || typeof token !== 'string') {
    console.log('Invalid token format:', token);
    return res.status(400).json({ message: 'Invalid token format' });
  }

  // Validate userId or restaurantId
  if (!userId && !restaurantId) {
    console.log('Invalid userId and restaurantId:', userId, restaurantId);
    return res.status(400).json({ message: 'Invalid userId or restaurantId' });
  }

  // Validate deviceId
  if (!deviceId || typeof deviceId !== 'string') {
    console.log('Invalid deviceId:', deviceId);
    return res.status(400).json({ message: 'Invalid deviceId' });
  }

  const trimmedToken = token.trim();
  if (!trimmedToken) {
    console.log('Empty token after trimming');
    return res.status(400).json({ message: 'Token is required and cannot be empty' });
  }

  try {
    console.log('Attempting to find and update or create token');

    // Determine the query based on userId or restaurantId
    const query = userId ? { userId, deviceId } : { restaurantId, deviceId };

    // Use findOneAndUpdate with upsert to update or create the token
    const result = await Token.findOneAndUpdate(
      query,
      {
        $set: {
          token: trimmedToken,
          platform,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          isActive: true,
        },
      },
      {
        upsert: true, // Create a new document if no match is found
        new: true, // Return the updated document
      }
    );

    console.log('Token operation successful:', result);
    res.status(200).json({
      message: 'Token saved successfully',
      isNew: !result.createdAt, // Indicates whether the token was newly created
      token: result,
    });
  } catch (error) {
    console.error('Detailed error in token route:', {
      error: error,
      message: error.message,
      stack: error.stack,
    });

    if (error.code === 11000 || error instanceof mongoose.Error.DuplicateKeyError) {
      // Handle duplicate key error (e.g., token already exists)
      return res.status(200).json({ message: 'Token already exists' });
    }

    res.status(500).json({
      message: 'Error saving token',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * @route   DELETE /api/tokens
 * @desc    Deactivate a token by token value or deviceId
 * @access  Public
 * @param   {Object} req - The request object containing the token or deviceId in the body
 * @param   {Object} res - The response object
 * @returns {Object} - Success or error message
 */
router.delete('/', async (req, res) => {
  const { token, deviceId } = req.body;

  // Validate token or deviceId
  if (!token && !deviceId) {
    return res.status(400).json({ message: 'Token or deviceId is required' });
  }

  try {
    // Deactivate the token
    const result = await Token.deactivateToken(token || deviceId);
    if (!result) {
      return res.status(404).json({ message: 'Token not found' });
    }

    res.status(200).json({ message: 'Token deactivated successfully', result });
  } catch (error) {
    console.error('Error deactivating token:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Error deactivating token', error: error.message });
  }
});

module.exports = router;