const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  itemName: String,
  description: String,
  imageUrl: String,
  category: String,
  isAvailable: { type: Boolean, default: true },
  sizes: {
    type: Map,
    of: Number,
    default: {}
  }
});

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  imageUrl: String,
  isActive: { type: Boolean, default: true },
  menu: [menuItemSchema],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema);