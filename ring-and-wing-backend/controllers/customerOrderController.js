const Order = require('../models/Order');
const Customer = require('../models/Customer');

// @desc    Get all orders for current customer
// @route   GET /api/customer/orders
// @access  Private (Customer)
exports.getCustomerOrders = async (req, res) => {
  try {
    const { limit = 20, page = 1, status } = req.query;
    
    const query = { customerId: req.customer._id };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await Order.countDocuments(query);
    
    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      orders
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/customer/orders/:id
// @access  Private (Customer)
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findOne({
      _id: id,
      customerId: req.customer._id
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// @desc    Reorder items from a previous order
// @route   POST /api/customer/orders/:id/reorder
// @access  Private (Customer)
exports.reorderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findOne({
      _id: id,
      customerId: req.customer._id
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Extract items for cart
    const cartItems = order.items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      availableSizes: item.availableSizes,
      pricing: item.pricing,
      modifiers: item.modifiers || []
    }));
    
    res.json({
      success: true,
      message: 'Items ready to reorder',
      cartItems
    });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing reorder',
      error: error.message
    });
  }
};
