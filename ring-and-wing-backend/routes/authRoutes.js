const express = require('express');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');
const { criticalCheck } = require('../middleware/dbConnectionMiddleware');
const router = express.Router();

router.post('/register', criticalCheck, registerUser);
router.post('/login', criticalCheck, loginUser);
router.post('/logout', criticalCheck, logoutUser);

module.exports = router;