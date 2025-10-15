const express = require('express');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const { auth } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', criticalCheck, registerUser);
router.post('/login', criticalCheck, loginUser);
router.post('/logout', auth, criticalCheck, logoutUser);

module.exports = router;