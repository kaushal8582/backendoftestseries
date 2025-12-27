const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, SUBSCRIPTION_STATUS } = require('../config/constants');

/**
 * Get all active subscription plans
 * @returns {Promise<Array>} - Array of subscription plans
 */
const getPlans = async () => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ order: 1, price: 1 });
  return plans;
};

/**
 * Get plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} - Subscription plan
 */
const getPlanById = async (planId) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }
  return plan;
};

/**
 * Get user's current subscription
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Current subscription or null
 */
const getCurrentSubscription = async (userId) => {
  const subscription = await UserSubscription.findOne({
    userId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    $or: [
      { endDate: { $gte: new Date() } },
      { endDate: null }, // Lifetime plan
    ],
  })
    .populate('planId')
    .sort({ createdAt: -1 });

  return subscription;
};

/**
 * Check if user has active subscription
 * @param {string} userId - User ID
 * @returns {Promise<Boolean>} - True if user has active subscription
 */
const hasActiveSubscription = async (userId) => {
  const subscription = await getCurrentSubscription(userId);
  return subscription !== null;
};

/**
 * Check if user is in trial period
 * @param {string} userId - User ID
 * @returns {Promise<Boolean>} - True if user is in trial
 */
const isInTrial = async (userId) => {
  const subscription = await UserSubscription.findOne({
    userId,
    isTrial: true,
    trialEndDate: { $gte: new Date() },
  });

  return subscription !== null;
};

/**
 * Create subscription (after payment)
 * @param {Object} subscriptionData - Subscription data
 * @returns {Promise<Object>} - Created subscription
 */
const createSubscription = async (subscriptionData) => {
  const { userId, planId, paymentId, isTrial, promoCodeId, referralCode } = subscriptionData;

  // Get plan
  const plan = await getPlanById(planId);

  // Calculate dates
  const startDate = new Date();
  let endDate = null;

  if (plan.planType === 'lifetime') {
    endDate = null; // Lifetime
  } else if (isTrial && plan.trialPeriod > 0) {
    endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.trialPeriod);
  } else {
    endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);
  }

  // Deactivate previous subscriptions
  await UserSubscription.updateMany(
    { userId, status: SUBSCRIPTION_STATUS.ACTIVE },
    { status: SUBSCRIPTION_STATUS.EXPIRED }
  );

  // Create new subscription
  const subscription = await UserSubscription.create({
    userId,
    planId,
    paymentId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    startDate,
    endDate,
    isTrial: isTrial || false,
    trialStartDate: isTrial ? startDate : null,
    trialEndDate: isTrial ? endDate : null,
    promoCodeId,
    referralCode,
  });

  return subscription.populate('planId');
};

/**
 * Start trial period
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} - Trial subscription
 */
const startTrial = async (userId, planId) => {
  // Check if user already used trial
  const existingTrial = await UserSubscription.findOne({
    userId,
    isTrial: true,
  });

  if (existingTrial) {
    throw new AppError('Trial period already used', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user has active subscription
  const activeSubscription = await hasActiveSubscription(userId);
  if (activeSubscription) {
    throw new AppError('User already has active subscription', HTTP_STATUS.BAD_REQUEST);
  }

  return await createSubscription({
    userId,
    planId,
    isTrial: true,
  });
};

/**
 * Cancel subscription
 * @param {string} userId - User ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} - Cancelled subscription
 */
const cancelSubscription = async (userId, reason = null) => {
  const subscription = await getCurrentSubscription(userId);
  
  if (!subscription) {
    throw new AppError('No active subscription found', HTTP_STATUS.NOT_FOUND);
  }

  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancelledAt = new Date();
  subscription.cancellationReason = reason;
  await subscription.save();

  return subscription;
};

module.exports = {
  getPlans,
  getPlanById,
  getCurrentSubscription,
  hasActiveSubscription,
  isInTrial,
  createSubscription,
  startTrial,
  cancelSubscription,
};

