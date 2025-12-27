const SubscriptionPlan = require('../models/SubscriptionPlan');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create subscription plan (admin)
 */
const createPlan = async (planData) => {
  const plan = await SubscriptionPlan.create(planData);
  return plan;
};

/**
 * Update subscription plan (admin)
 */
const updatePlan = async (planId, updateData) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  Object.assign(plan, updateData);
  await plan.save();

  return plan;
};

/**
 * Delete subscription plan (admin)
 */
const deletePlan = async (planId) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  plan.isActive = false;
  await plan.save();
};

module.exports = {
  createPlan,
  updatePlan,
  deletePlan,
};

