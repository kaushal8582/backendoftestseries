const subscriptionService = require('../services/subscriptionService');
const subscriptionPlanService = require('../services/subscriptionPlanService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get all subscription plans
 */
const getPlans = async (req, res, next) => {
  try {
    const plans = await subscriptionService.getPlans();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current subscription
 */
const getCurrentSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const subscription = await subscriptionService.getCurrentSubscription(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start trial
 */
const startTrial = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const userId = req.user._id;

    const subscription = await subscriptionService.startTrial(userId, planId);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Trial started successfully',
      data: { subscription },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const userId = req.user._id;

    const subscription = await subscriptionService.cancelSubscription(userId, reason);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: { subscription },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create subscription plan (admin)
 */
const createPlan = async (req, res, next) => {
  try {
    const plan = await subscriptionPlanService.createPlan(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update subscription plan (admin)
 */
const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await subscriptionPlanService.updatePlan(id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: { plan },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete subscription plan (admin)
 */
const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    await subscriptionPlanService.deletePlan(id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Subscription plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  startTrial,
  cancelSubscription,
  createPlan,
  updatePlan,
  deletePlan,
};

