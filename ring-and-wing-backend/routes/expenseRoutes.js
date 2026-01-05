const express = require('express');
const router = express.Router();
const Expense = require('../models/expense');
const { auth } = require('../middleware/authMiddleware');
const { getBusinessDayRangeUtc } = require('../utils/businessTime');

// Helper: Check if user is admin/manager (can approve expenses)
const isAdminOrManager = (user) => {
  return user.role === 'manager' || 
         ['shift_manager', 'general_manager', 'admin'].includes(user.position);
};

// Helper: Check if user is staff (needs approval for expenses)
const isStaff = (user) => {
  return user.role === 'staff' && 
         ['cashier', 'inventory'].includes(user.position);
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private - All authenticated users
router.post('/', auth, async (req, res) => {
  try {
    const { date, amount, category, description, purpose, paymentMethod } = req.body;
    
    // Validate required fields
    if (!date || !amount || !category || !description || !paymentMethod) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: date, amount, category, description, paymentMethod' 
      });
    }
    
    const expenseData = {
      date: new Date(date),
      amount: parseFloat(amount),
      category,
      description,
      purpose: purpose || null,
      paymentMethod,
      disbursed: false
    };
    
    // Role-based status assignment
    if (isStaff(req.user)) {
      // Staff creates expense REQUEST (needs approval)
      expenseData.status = 'for_approval';
      expenseData.requesterId = req.user._id;
      expenseData.requesterName = req.user.username;
      expenseData.requesterPosition = req.user.position;
    } else {
      // Admin/Manager creates expense DIRECTLY (no approval needed)
      expenseData.status = 'created';
      expenseData.createdBy = req.user._id;
      expenseData.creatorName = req.user.username;
      expenseData.creatorRole = req.user.role;
    }
    
    const expense = new Expense(expenseData);
    await expense.save();
    
    res.status(201).json({
      success: true,
      message: isStaff(req.user) 
        ? 'Expense request submitted for approval' 
        : 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('[Expense Create Error]:', error);
    res.status(400).json({ 
      success: false,
      message: 'Invalid expense data', 
      error: error.message 
    });
  }
});

// @desc    Get expenses (role-based filtering)
// @route   GET /api/expenses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, search, disbursed, permanent, status } = req.query;
    const filter = {};

    // Role-based filtering
    if (isStaff(req.user)) {
      // Staff can only see their own requests
      filter.requesterId = req.user._id;
    }
    // Admin/Manager can see all expenses (no requesterId filter)

    // Apply other filters
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (disbursed !== undefined) {
      filter.disbursed = disbursed === 'true';
    }
    if (permanent !== undefined) {
      filter.permanent = permanent === 'true';
    }
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { requesterName: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(filter).sort('-date');
    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('[Expense Get Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Get staff's own expense requests
// @route   GET /api/expenses/my-requests
// @access  Private - Staff only
router.get('/my-requests', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { requesterId: req.user._id };
    
    if (status && status !== 'All') {
      filter.status = status;
    }

    const expenses = await Expense.find(filter).sort('-createdAt');
    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('[My Requests Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Get pending approval requests
// @route   GET /api/expenses/pending-approvals
// @access  Private - Admin/Manager only
router.get('/pending-approvals', auth, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Only managers can view pending approvals.' 
      });
    }

    const expenses = await Expense.find({ status: 'for_approval' }).sort('-createdAt');
    res.json({
      success: true,
      data: expenses,
      count: expenses.length
    });
  } catch (error) {
    console.error('[Pending Approvals Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Get expense statistics for dashboard
// @route   GET /api/expenses/stats
// @access  Private - Admin/Manager only
router.get('/stats', auth, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const pendingCount = await Expense.countDocuments({ status: 'for_approval' });
    const approvedCount = await Expense.countDocuments({ status: 'approved' });
    const paidCount = await Expense.countDocuments({ status: 'paid' });
    const rejectedCount = await Expense.countDocuments({ status: 'rejected' });
    
    // Total amounts
    const pendingTotal = await Expense.aggregate([
      { $match: { status: 'for_approval' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const approvedTotal = await Expense.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          paid: paidCount,
          rejected: rejectedCount
        },
        totals: {
          pending: pendingTotal[0]?.total || 0,
          approved: approvedTotal[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('[Stats Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Approve expense request
// @route   POST /api/expenses/:id/approve
// @access  Private - Admin/Manager only
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Only managers can approve expenses.' 
      });
    }

    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }
    
    if (expense.status !== 'for_approval') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot approve expense with status: ${expense.status}` 
      });
    }

    expense.status = 'approved';
    expense.approvedBy = req.user._id;
    expense.approverName = req.user.username;
    expense.approvedAt = new Date();
    
    await expense.save();

    res.json({
      success: true,
      message: 'Expense approved successfully',
      data: expense
    });
  } catch (error) {
    console.error('[Approve Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Reject expense request
// @route   POST /api/expenses/:id/reject
// @access  Private - Admin/Manager only
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Only managers can reject expenses.' 
      });
    }

    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ 
        success: false,
        message: 'Rejection reason is required' 
      });
    }

    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }
    
    if (expense.status !== 'for_approval') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot reject expense with status: ${expense.status}` 
      });
    }

    expense.status = 'rejected';
    expense.rejectionReason = reason;
    expense.approvedBy = req.user._id;
    expense.approverName = req.user.username;
    expense.approvedAt = new Date();
    
    await expense.save();

    res.json({
      success: true,
      message: 'Expense rejected',
      data: expense
    });
  } catch (error) {
    console.error('[Reject Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Mark expense as paid
// @route   POST /api/expenses/:id/mark-paid
// @access  Private - Admin/Manager only
router.post('/:id/mark-paid', auth, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Only managers can mark expenses as paid.' 
      });
    }

    const { paymentMethod } = req.body || {};
    const allowedPaymentMethods = ['Cash', 'Bank Transfer', 'Digital Wallet'];

    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }
    
    // Only 'approved' or 'created' (admin-created) can be marked as paid
    if (!['approved', 'created'].includes(expense.status)) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot mark expense as paid. Current status: ${expense.status}` 
      });
    }

    // If expense has no payment method yet, require it now
    if (!expense.paymentMethod) {
      if (!paymentMethod || !allowedPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Payment method is required to mark this expense as paid',
          required: allowedPaymentMethods
        });
      }
      expense.paymentMethod = paymentMethod;
    } else if (paymentMethod) {
      // Allow updating payment method at mark-paid time if provided
      if (!allowedPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method',
          allowed: allowedPaymentMethods
        });
      }
      expense.paymentMethod = paymentMethod;
    }

    expense.status = 'paid';
    expense.disbursed = true;
    expense.permanent = true;
    expense.disbursementDate = new Date();
    
    // If not already approved (admin-created), set approver info
    if (!expense.approvedBy) {
      expense.approvedBy = req.user._id;
      expense.approverName = req.user.username;
      expense.approvedAt = new Date();
    }
    
    await expense.save();

    res.json({
      success: true,
      message: 'Expense marked as paid',
      data: expense
    });
  } catch (error) {
    console.error('[Mark Paid Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }
    
    // Staff can only edit their own pending requests
    if (isStaff(req.user)) {
      if (!expense.requesterId || expense.requesterId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false,
          message: 'You can only edit your own expense requests' 
        });
      }
      if (expense.status !== 'for_approval') {
        return res.status(400).json({ 
          success: false,
          message: 'Can only edit expenses that are pending approval' 
        });
      }
    }
    
    // Update allowed fields
    const allowedUpdates = ['date', 'amount', 'category', 'description', 'purpose', 'paymentMethod'];
    
    // Admin can also update status-related fields directly
    if (isAdminOrManager(req.user)) {
      allowedUpdates.push('disbursed', 'permanent', 'disbursementDate', 'status');
    }
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });
    
    await expense.save();
    
    res.json({
      success: true,
      message: 'Expense updated',
      data: expense
    });
  } catch (error) {
    console.error('[Update Error]:', error);
    res.status(400).json({ 
      success: false,
      message: 'Update failed', 
      error: error.message 
    });
  }
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found' 
      });
    }
    
    // Staff can only delete their own pending requests
    if (isStaff(req.user)) {
      if (!expense.requesterId || expense.requesterId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false,
          message: 'You can only delete your own expense requests' 
        });
      }
      if (expense.status !== 'for_approval') {
        return res.status(400).json({ 
          success: false,
          message: 'Can only delete expenses that are pending approval' 
        });
      }
    }
    
    await Expense.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true,
      message: 'Expense removed' 
    });
  } catch (error) {
    console.error('[Delete Error]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @desc    Get daily disbursement stats
// @route   POST /api/expenses/reset-disbursement
// @access  Private
router.post('/reset-disbursement', auth, async (req, res) => {
  try {
    const { dateKey, startOfDayUtc, startOfNextDayUtc } = getBusinessDayRangeUtc(new Date());
    
    const todayDisbursedCount = await Expense.countDocuments({
      disbursementDate: { $gte: startOfDayUtc, $lt: startOfNextDayUtc },
      disbursed: true
    });
    
    const allDisbursedCount = await Expense.countDocuments({
      disbursed: true
    });
    
    res.json({
      success: true,
      message: 'Daily disbursement statistics calculated',
      todayCount: todayDisbursedCount,
      allTimeCount: allDisbursedCount,
      date: dateKey
    });
  } catch (error) {
    console.error('[Stats Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get disbursement statistics',
      error: error.message
    });
  }
});

module.exports = router;
