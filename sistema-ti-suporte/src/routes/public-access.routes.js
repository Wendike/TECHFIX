const express = require('express');

const PublicAccessController = require('../controllers/PublicAccessController');

const router = express.Router();

router.get('/first-access', PublicAccessController.firstAccessForm);
router.post('/first-access', PublicAccessController.firstAccess);

router.get('/forgot-password', PublicAccessController.forgotPasswordForm);
router.post('/forgot-password', PublicAccessController.forgotPassword);

router.get('/reset-password/:token', PublicAccessController.resetPasswordForm);
router.post('/reset-password/:token', PublicAccessController.resetPassword);

module.exports = router;
