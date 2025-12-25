const mongoose = require('mongoose');
const { SUBSCRIPTION_STATUS } = require('../config/constants');

/**
 * User Subscription Model (Future Ready)
 * This model tracks user subscriptions for future payment integration
 */
const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user ID'],
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Please provide plan ID'],
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.ACTIVE,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // For future: payment integration fields
    // transactionId: String,
    // paymentMethod: String,
    // amountPaid: Number,
    // paymentStatus: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ userId: 1, endDate: 1 });
userSubscriptionSchema.index({ status: 1 });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);

