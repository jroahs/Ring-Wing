const { check, validationResult } = require('express-validator');

exports.validateStaff = [
  check('personal_info.first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name too long'),
    
  check('personal_info.last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name too long'),

  check('contact_info.email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  check('contact_info.phone')
    .matches(/^(09|\+639)\d{9}$/).withMessage('Invalid Philippine phone number'),

  check('employment_details.position')
    .isIn(['Barista', 'Cashier', 'Chef', 'Manager', 'Supervisor'])
    .withMessage('Invalid position'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];