const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   GET /api/referrals/code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/code', authenticate, referralController.getReferralCode);

/**
 * @route   GET /api/referrals/stats
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/stats', authenticate, referralController.getReferralStats);

/**
 * @route   GET /api/referrals
 * @desc    Get all referrals (admin)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, authorize(USER_ROLES.ADMIN), referralController.getAllReferrals);

module.exports = router;

