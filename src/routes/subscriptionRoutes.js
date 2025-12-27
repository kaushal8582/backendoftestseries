const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get all subscription plans
 * @access  Public
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current subscription
 * @access  Private
 */
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);

/**
 * @route   POST /api/subscriptions/trial
 * @desc    Start trial period
 * @access  Private
 */
router.post('/trial', authenticate, subscriptionController.startTrial);

/**
 * @route   PUT /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.put('/cancel', authenticate, subscriptionController.cancelSubscription);

/**
 * @route   POST /api/subscriptions/plans
 * @desc    Create subscription plan (admin)
 * @access  Private (Admin only)
 */
router.post('/plans', authenticate, authorize(USER_ROLES.ADMIN), subscriptionController.createPlan);

/**
 * @route   PUT /api/subscriptions/plans/:id
 * @desc    Update subscription plan (admin)
 * @access  Private (Admin only)
 */
router.put('/plans/:id', authenticate, authorize(USER_ROLES.ADMIN), subscriptionController.updatePlan);

/**
 * @route   DELETE /api/subscriptions/plans/:id
 * @desc    Delete subscription plan (admin)
 * @access  Private (Admin only)
 */
router.delete('/plans/:id', authenticate, authorize(USER_ROLES.ADMIN), subscriptionController.deletePlan);

module.exports = router;

