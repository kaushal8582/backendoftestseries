const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create payment order
 * @access  Private
 */
router.post('/create-order', authenticate, paymentController.createPaymentOrder);

/**
 * @route   POST /api/payments/track-click
 * @desc    Track payment click
 * @access  Private
 */
router.post('/track-click', authenticate, paymentController.trackPaymentClick);

/**
 * @route   POST /api/payments/webhook
 * @desc    Razorpay webhook handler
 * @access  Public (Razorpay calls this)
 */
router.post('/webhook', paymentController.razorpayWebhook);

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/history', authenticate, paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', authenticate, paymentController.getPaymentById);

/**
 * @route   GET /api/payments
 * @desc    Get all payments (admin)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, authorize(USER_ROLES.ADMIN), paymentController.getAllPayments);

module.exports = router;

