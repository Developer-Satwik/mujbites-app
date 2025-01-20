const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  sizes: {
    type: Map,
    of: Number,
    required: true,
  },
  description: {
    type: String,
    default: ""
  },
  imageUrl: {
    type: String,
    default: ""
  },
  category: {
    type: String,
    required: true
  },
  popularity: {
    type: Number,
    default: 0
  },
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  openingTime: {
    type: Date
  },
  menu: [menuItemSchema],
});

module.exports = mongoose.model('Restaurant', restaurantSchema);