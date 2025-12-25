const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, SUBSCRIPTION_STATUS } = require('../config/constants');
const UserSubscription = require('../models/UserSubscription');
const Test = require('../models/Test');

/**
 * Check if user has active subscription
 * This is a placeholder middleware for future subscription integration
 * Currently, it checks if test is free or user has active subscription
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const checkSubscription = async (req, res, next) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return next(new AppError('Test ID is required', HTTP_STATUS.BAD_REQUEST));
    }

    // Get test details
    const test = await Test.findById(testId);

    if (!test) {
      return next(new AppError('Test not found', HTTP_STATUS.NOT_FOUND));
    }

    // If test is free, allow access
    if (test.isFree) {
      return next();
    }

    // Check if user has active subscription
    // This is a placeholder for future implementation
    const activeSubscription = await UserSubscription.findOne({
      userId: req.user._id,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endDate: { $gte: new Date() },
    });

    if (!activeSubscription) {
      return next(
        new AppError(
          'This test requires an active subscription. Please subscribe to access.',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkSubscription,
};

