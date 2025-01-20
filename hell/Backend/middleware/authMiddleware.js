const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Middleware to authenticate JWT tokens.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log("Auth Header:", authHeader);

  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      error: 'No authorization token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. No token provided.',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token expired. Please log in again.',
          clearCache: true, // Signal the frontend to clear cache
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token',
        });
      }
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed',
        message: err.message,
      });
    }

    console.log("Decoded Token:", decoded);

    User.findById(decoded.userId)
      .then(user => {
        if (!user) {
          return res.status(401).json({ 
            success: false,
            error: 'User not found',
          });
        }

        req.user = {
          userId: user._id,
          role: user.role,
          username: user.username,
          restaurant: user.restaurant, // Include restaurant ID if applicable
        };

        console.log("req.user set:", req.user);
        next();
      })
      .catch(error => {
        console.error("Database error:", {
          error: error.message,
          stack: error.stack,
        });
        res.status(500).json({ 
          success: false,
          error: 'Database error',
          message: error.message,
        });
      });
  });
};

module.exports = authenticateToken;