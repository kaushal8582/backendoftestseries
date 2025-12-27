const Referral = require('../models/Referral');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Generate unique referral code for user
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Referral code
 */
const generateReferralCode = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Generate code from user ID and name
  const code = `${user.name.substring(0, 3).toUpperCase()}${userId.toString().substring(0, 6).toUpperCase()}`;

  // Check if code already exists
  const existingUser = await User.findOne({ referralCode: code });
  if (existingUser) {
    // If exists, add random suffix
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${code}${randomSuffix}`;
  }

  return code;
};

/**
 * Get or create referral code for user
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Referral code
 */
const getOrCreateReferralCode = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.referralCode) {
    return user.referralCode;
  }

  // Generate and assign referral code
  const referralCode = await generateReferralCode(userId);
  user.referralCode = referralCode;
  await user.save();

  return referralCode;
};

/**
 * Apply referral code
 * @param {string} referralCode - Referral code
 * @param {string} userId - User ID (referee)
 * @param {Number} orderAmount - Order amount in paise
 * @returns {Promise<Object>} - Discount details
 */
const applyReferralCode = async (referralCode, userId, orderAmount) => {
  // Find referrer by referral code
  const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
  if (!referrer) {
    throw new AppError('Invalid referral code', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user is trying to use their own code
  if (referrer._id.toString() === userId) {
    throw new AppError('You cannot use your own referral code', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user already used a referral code
  const existingReferral = await Referral.findOne({
    refereeId: userId,
    status: { $in: ['pending', 'completed'] },
  });

  if (existingReferral) {
    throw new AppError('You have already used a referral code', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user was already referred by this referrer
  const existingReferralBySameReferrer = await Referral.findOne({
    referrerId: referrer._id,
    refereeId: userId,
  });

  if (existingReferralBySameReferrer) {
    throw new AppError('You have already been referred by this user', HTTP_STATUS.BAD_REQUEST);
  }

  // Get referral settings (from admin - for now using default)
  // TODO: Create ReferralSettings model for admin to configure
  const referrerDiscountPercent = 10; // 10% discount for referrer
  const refereeDiscountPercent = 15; // 15% discount for referee

  // Calculate discount for referee (current user)
  const discount = Math.round((orderAmount * refereeDiscountPercent) / 100);
  const finalAmount = Math.max(0, orderAmount - discount);

  // Create referral record
  await Referral.create({
    referrerId: referrer._id,
    refereeId: userId,
    referralCode: referralCode.toUpperCase(),
    status: 'pending',
    referrerReward: {
      type: 'discount',
      value: referrerDiscountPercent,
    },
    refereeReward: {
      type: 'discount',
      value: refereeDiscountPercent,
    },
  });

  // Update user's referredBy
  const user = await User.findById(userId);
  user.referredBy = referrer._id;
  user.referralCodeUsed = referralCode.toUpperCase();
  await user.save();

  return {
    discount, // Return in paise
    finalAmount,
    referrerId: referrer._id,
  };
};

/**
 * Process referral when payment is successful
 * @param {string} userId - User ID (referee)
 * @param {string} referralCode - Referral code used
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Processed referral
 */
const processReferral = async (userId, referralCode, paymentId) => {
  const referral = await Referral.findOne({
    refereeId: userId,
    referralCode: referralCode.toUpperCase(),
    status: 'pending',
  });

  if (!referral) {
    return null; // No referral to process
  }

  // Mark referral as completed
  referral.status = 'completed';
  referral.completedAt = new Date();
  referral.triggerPaymentId = paymentId;
  referral.refereeReward.applied = true;
  referral.refereeReward.appliedAt = new Date();

  // Apply referrer reward (discount for next purchase)
  referral.referrerReward.applied = true;
  referral.referrerReward.appliedAt = new Date();

  await referral.save();

  // Update referrer's total referrals count
  const referrer = await User.findById(referral.referrerId);
  referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;
  await referrer.save();

  return referral;
};

/**
 * Get referral stats for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Referral statistics
 */
const getReferralStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const referrals = await Referral.find({ referrerId: userId })
    .populate('refereeId', 'name email createdAt')
    .sort({ createdAt: -1 });

  const completedReferrals = referrals.filter((r) => r.status === 'completed');
  const pendingReferrals = referrals.filter((r) => r.status === 'pending');

  return {
    referralCode: user.referralCode,
    totalReferrals: referrals.length,
    completedReferrals: completedReferrals.length,
    pendingReferrals: pendingReferrals.length,
    referrals,
  };
};

/**
 * Get all referrals (admin)
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Referrals with pagination
 */
const getAllReferrals = async (filters = {}) => {
  const { page = 1, limit = 20, referrerId, status } = filters;
  const skip = (page - 1) * limit;

  const query = {};
  if (referrerId) query.referrerId = referrerId;
  if (status) query.status = status;

  const referrals = await Referral.find(query)
    .populate('referrerId', 'name email referralCode')
    .populate('refereeId', 'name email')
    .populate('triggerPaymentId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Referral.countDocuments(query);

  return {
    referrals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  generateReferralCode,
  getOrCreateReferralCode,
  applyReferralCode,
  processReferral,
  getReferralStats,
  getAllReferrals,
};

