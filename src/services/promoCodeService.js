const PromoCode = require('../models/PromoCode');
const Payment = require('../models/Payment');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get all promo codes (admin)
 * @returns {Promise<Array>} - Array of promo codes
 */
const getPromoCodes = async () => {
  const promoCodes = await PromoCode.find()
    .populate('createdBy', 'name email')
    .populate('applicablePlans')
    .sort({ createdAt: -1 });
  return promoCodes;
};

/**
 * Get promo code by code
 * @param {string} code - Promo code
 * @returns {Promise<Object>} - Promo code
 */
const getPromoCodeByCode = async (code) => {
  const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
  if (!promoCode) {
    throw new AppError('Promo code not found', HTTP_STATUS.NOT_FOUND);
  }
  return promoCode;
};

/**
 * Validate and apply promo code
 * @param {string} code - Promo code
 * @param {string} userId - User ID
 * @param {Number} orderAmount - Order amount in paise
 * @param {string} planId - Plan ID (optional)
 * @returns {Promise<Object>} - Discount details
 */
const applyPromoCode = async (code, userId, orderAmount, planId = null) => {
  const promoCode = await getPromoCodeByCode(code);

  // Check if promo code is valid
  if (!promoCode.isValid()) {
    throw new AppError('Promo code is not valid or expired', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if applicable to plan
  if (planId && promoCode.applicablePlans.length > 0) {
    const isApplicable = promoCode.applicablePlans.some(
      (id) => id.toString() === planId.toString()
    );
    if (!isApplicable) {
      throw new AppError('Promo code is not applicable to this plan', HTTP_STATUS.BAD_REQUEST);
    }
  }

  // Check usage limit
  if (promoCode.maxUsage && promoCode.usedCount >= promoCode.maxUsage) {
    throw new AppError('Promo code usage limit reached', HTTP_STATUS.BAD_REQUEST);
  }

  // Check per user usage limit
  const userUsageCount = await Payment.countDocuments({
    userId,
    promoCodeId: promoCode._id,
    paymentStatus: 'success',
  });

  if (userUsageCount >= promoCode.maxUsagePerUser) {
    throw new AppError('You have already used this promo code', HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate discount
  const discount = promoCode.calculateDiscount(orderAmount / 100); // Convert to rupees
  const finalAmount = Math.max(0, orderAmount - Math.round(discount * 100)); // Convert back to paise

  return {
    promoCodeId: promoCode._id,
    discount: Math.round(discount * 100), // Return in paise
    finalAmount,
    promoCode,
  };
};

/**
 * Create promo code (admin)
 * @param {Object} promoData - Promo code data
 * @returns {Promise<Object>} - Created promo code
 */
const createPromoCode = async (promoData) => {
  const existingCode = await PromoCode.findOne({ code: promoData.code.toUpperCase() });
  if (existingCode) {
    throw new AppError('Promo code already exists', HTTP_STATUS.CONFLICT);
  }

  const promoCode = await PromoCode.create({
    ...promoData,
    code: promoData.code.toUpperCase(),
  });

  return promoCode;
};

/**
 * Update promo code (admin)
 * @param {string} promoCodeId - Promo code ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} - Updated promo code
 */
const updatePromoCode = async (promoCodeId, updateData) => {
  const promoCode = await PromoCode.findById(promoCodeId);
  if (!promoCode) {
    throw new AppError('Promo code not found', HTTP_STATUS.NOT_FOUND);
  }

  if (updateData.code) {
    updateData.code = updateData.code.toUpperCase();
    const existingCode = await PromoCode.findOne({
      code: updateData.code,
      _id: { $ne: promoCodeId },
    });
    if (existingCode) {
      throw new AppError('Promo code already exists', HTTP_STATUS.CONFLICT);
    }
  }

  Object.assign(promoCode, updateData);
  await promoCode.save();

  return promoCode;
};

/**
 * Delete promo code (admin)
 * @param {string} promoCodeId - Promo code ID
 * @returns {Promise<void>}
 */
const deletePromoCode = async (promoCodeId) => {
  const promoCode = await PromoCode.findById(promoCodeId);
  if (!promoCode) {
    throw new AppError('Promo code not found', HTTP_STATUS.NOT_FOUND);
  }

  promoCode.isActive = false;
  await promoCode.save();
};

module.exports = {
  getPromoCodes,
  getPromoCodeByCode,
  applyPromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
};

