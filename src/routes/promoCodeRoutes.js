const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   GET /api/promo-codes
 * @desc    Get all promo codes (admin)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, authorize(USER_ROLES.ADMIN), promoCodeController.getPromoCodes);

/**
 * @route   POST /api/promo-codes/validate
 * @desc    Validate promo code
 * @access  Private
 */
router.post('/validate', authenticate, promoCodeController.validatePromoCode);

/**
 * @route   POST /api/promo-codes
 * @desc    Create promo code (admin)
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorize(USER_ROLES.ADMIN), promoCodeController.createPromoCode);

/**
 * @route   PUT /api/promo-codes/:id
 * @desc    Update promo code (admin)
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorize(USER_ROLES.ADMIN), promoCodeController.updatePromoCode);

/**
 * @route   DELETE /api/promo-codes/:id
 * @desc    Delete promo code (admin)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(USER_ROLES.ADMIN), promoCodeController.deletePromoCode);

module.exports = router;

