const promoCodeService = require('../services/promoCodeService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get all promo codes (admin)
 */
const getPromoCodes = async (req, res, next) => {
  try {
    const promoCodes = await promoCodeService.getPromoCodes();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { promoCodes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate promo code
 */
const validatePromoCode = async (req, res, next) => {
  try {
    const { code, planId, amount } = req.body;
    const userId = req.user._id;

    const result = await promoCodeService.applyPromoCode(code, userId, amount * 100, planId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        discount: result.discount / 100, // Convert to rupees
        finalAmount: result.finalAmount / 100,
        promoCode: result.promoCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create promo code (admin)
 */
const createPromoCode = async (req, res, next) => {
  try {
    const promoData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const promoCode = await promoCodeService.createPromoCode(promoData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Promo code created successfully',
      data: { promoCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update promo code (admin)
 */
const updatePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promoCode = await promoCodeService.updatePromoCode(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Promo code updated successfully',
      data: { promoCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete promo code (admin)
 */
const deletePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    await promoCodeService.deletePromoCode(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Promo code deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromoCodes,
  validatePromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
};

