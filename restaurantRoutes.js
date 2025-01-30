// ... existing code ...

// Replace the existing owner route with this new one
router.get('/my-restaurant', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const restaurant = await Restaurant.findOne({ owner: userId });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found for this owner' });
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ message: 'Error fetching restaurant data', error: error.message });
  }
});

// Update the order status endpoint
router.put('/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Placed', 'Accepted', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized (restaurant owner)
    const user = await User.findById(req.user.userId);
    const restaurant = await Restaurant.findById(order.restaurant);
    
    if (!user || !restaurant || restaurant.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this order' });
    }

    order.orderStatus = status;
    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// ... rest of existing code ...
