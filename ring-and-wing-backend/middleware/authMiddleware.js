const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Protected route
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

module.exports = router;