const Order = require('../models/orders');
const Restaurant = require('../models/restaurantModel');
const { sendOrderNotification } = require('../notifications/orderNotifications');

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private (Customer)
 */
const createOrder = async (req, res) => {
  try {
    const { restaurant, restaurantName, items, totalAmount, address } = req.body;
    const customer = req.user.userId; // Get the user ID from the token

    // Input validation
    if (!restaurant) {
      return res.status(400).json({ message: "Restaurant ID is required." });
    }
    if (!restaurantName) {
      return res.status(400).json({ message: "Restaurant name is required." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required." });
    }
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: "Valid total amount is required." });
    }
    if (!address) {
      return res.status(400).json({ message: "Delivery address is required." });
    }

    // Validate each item in the order
    const validatedItems = items.map((item) => {
      if (!item.menuItem || !item.itemName || !item.quantity) {
        throw new Error("Each item must include menuItem, itemName, and quantity.");
      }
      return {
        menuItem: item.menuItem,
        itemName: item.itemName,
        quantity: item.quantity,
        size: item.size || "Regular", // Default size if not provided
      };
    });

    // Create a new order
    const order = new Order({
      restaurant,
      restaurantName,
      customer,
      items: validatedItems,
      totalAmount,
      address,
      orderStatus: "Placed", // Initial status
    });

    await order.save();

    // Send notification to the customer
    try {
      const customerNotificationResult = await sendOrderNotification(
        customer,
        'ORDER_PLACED',
        { restaurantName: order.restaurantName }
      );

      if (customerNotificationResult.success) {
        console.log("Customer notification sent successfully:", customerNotificationResult);
      } else {
        console.error("Failed to send customer notification:", customerNotificationResult.error);
      }
    } catch (error) {
      console.error("Error sending customer notification:", error);
    }

    // Send notification to the restaurant owner
    try {
      const restaurantData = await Restaurant.findById(restaurant).populate("owner");
      if (!restaurantData || !restaurantData.owner) {
        console.error("Restaurant owner not found.");
      } else {
        const restaurantOwnerId = restaurantData.owner._id;

        const restaurantNotificationResult = await sendOrderNotification(
          restaurantOwnerId,
          'NEW_ORDER',
          { restaurantName: order.restaurantName }
        );

        if (restaurantNotificationResult.success) {
          console.log("Restaurant owner notification sent successfully:", restaurantNotificationResult);
        } else {
          console.error("Failed to send restaurant owner notification:", restaurantNotificationResult.error);
        }
      }
    } catch (error) {
      console.error("Error sending restaurant owner notification:", error);
    }

    res.status(201).json({ message: "Order placed successfully.", order });
  } catch (error) {
    console.error("Error creating order:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

/**
 * @route   GET /api/orders
 * @desc    Get all orders for the logged-in customer
 * @access  Private (Customer)
 */
const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.user.userId; // Get the user ID from the token

    // Fetch orders for the logged-in customer
    const orders = await Order.find({ customer: customerId })
      .populate("restaurant", "name") // Populate restaurant details
      .populate("items.menuItem", "name price") // Populate menu item details
      .sort({ createdAt: -1 }); // Sort by creation date (newest first)

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching customer orders:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

/**
 * @route   GET /api/orders/restaurant/:restaurantId
 * @desc    Get all orders for a specific restaurant
 * @access  Private (Restaurant Owner)
 */
const getRestaurantOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.userId;

    // Verify that the user is the owner of the restaurant
    const restaurant = await Restaurant.findById(restaurantId).populate("owner");
    if (!restaurant || restaurant.owner._id.toString() !== userId) {
      return res.status(403).json({ message: "Forbidden: You do not own this restaurant." });
    }

    // Fetch orders for the restaurant
    const orders = await Order.find({ restaurant: restaurantId })
      .populate("customer", "username phone address") // Populate customer details
      .populate("items.menuItem", "name price") // Populate menu item details
      .sort({ createdAt: -1 }); // Sort by creation date (newest first)

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching restaurant orders:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

/**
 * @route   PATCH /api/orders/:orderId/confirm
 * @desc    Confirm an order (Restaurant Owner)
 * @access  Private (Restaurant Owner)
 */
const confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Update the order status to "Accepted"
    const order = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: "Accepted" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Send notification to the customer
    try {
      const result = await sendOrderNotification(
        order.customer,
        'ORDER_CONFIRMED'
      );

      if (result.success) {
        console.log("Notification sent successfully:", result);
      } else {
        console.error("Failed to send notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }

    res.status(200).json({ message: "Order confirmed successfully.", order });
  } catch (error) {
    console.error("Error confirming order:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

/**
 * @route   PATCH /api/orders/:orderId/deliver
 * @desc    Mark an order as delivered (Restaurant Owner)
 * @access  Private (Restaurant Owner)
 */
const deliverOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Update the order status to "Delivered"
    const order = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: "Delivered" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Send notification to the customer
    try {
      const result = await sendOrderNotification(
        order.customer,
        'ORDER_DELIVERED'
      );

      if (result.success) {
        console.log("Notification sent successfully:", result);
      } else {
        console.error("Failed to send notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }

    res.status(200).json({ message: "Order marked as delivered.", order });
  } catch (error) {
    console.error("Error delivering order:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

module.exports = {
  createOrder,
  getCustomerOrders,
  getRestaurantOrders,
  confirmOrder,
  deliverOrder,
};