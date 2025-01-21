const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token: {
    type: String,
    unique: true,
    required: [true, 'Token is required'],
    trim: true, // Automatically trim whitespace
    validate: {
      validator: function (v) {
        // Ensure the token is a non-empty string
        return typeof v === 'string' && v.length > 0;
      },
      message: 'Token must be a non-empty string',
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    validate: {
      validator: function (v) {
        // Ensure the userId is a valid MongoDB ObjectId
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid user ID',
    },
  },
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    trim: true,
    validate: {
      validator: function (v) {
        // Ensure the device ID is a non-empty string
        return typeof v === 'string' && v.length > 0;
      },
      message: 'Device ID must be a non-empty string',
    },
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios'],
    default: 'web',
    required: [true, 'Platform is required'],
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    index: { expires: '30d' }, // Automatically delete the document after 30 days
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Indexes
tokenSchema.index({ token: 1 }, { unique: true }); // Ensure token uniqueness
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens
tokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true }); // Ensure one token per user per device

// Middleware to validate token, userId, and deviceId before saving
tokenSchema.pre('save', function (next) {
  if (!this.token || !this.userId || !this.deviceId) {
    const error = new Error('Token, userId, and deviceId are required');
    return next(error);
  }
  next();
});

// Static method to find an active token by token value
tokenSchema.statics.findActiveToken = function (token) {
  return this.findOne({ token, isActive: true });
};

// Static method to find all active tokens for a user
tokenSchema.statics.findActiveTokensByUser = function (userId) {
  return this.find({ userId, isActive: true });
};

// Static method to deactivate a token by token value
tokenSchema.statics.deactivateToken = function (token) {
  return this.findOneAndUpdate(
    { token },
    { isActive: false },
    { new: true }
  );
};

// Static method to deactivate all tokens for a user
tokenSchema.statics.deactivateTokensByUser = function (userId) {
  return this.updateMany(
    { userId },
    { isActive: false }
  );
};

// Static method to delete expired tokens
tokenSchema.statics.deleteExpiredTokens = function () {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Static method to update or create a token for a user and device
tokenSchema.statics.upsertToken = function (userId, deviceId, token, platform = 'web') {
  return this.findOneAndUpdate(
    { userId, deviceId },
    { token, platform, isActive: true, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Token', tokenSchema);