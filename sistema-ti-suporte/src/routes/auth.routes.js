const express = require('express');

const AuthController = require('../controllers/AuthController');
const guestMiddleware = require('../middlewares/guestMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/login', guestMiddleware, AuthController.showLogin);
router.post('/login', guestMiddleware, AuthController.login);

router.post('/logout', authMiddleware, AuthController.logout);
router.get('/logout', authMiddleware, AuthController.logout);

module.exports = router;
