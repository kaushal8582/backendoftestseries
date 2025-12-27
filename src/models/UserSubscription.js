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
    // Trial period
    isTrial: {
      type: Boolean,
      default: false,
    },
    trialStartDate: {
      type: Date,
      default: null,
    },
    trialEndDate: {
      type: Date,
      default: null,
    },
    // Payment details
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    // Promo code used
    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    // Referral code used
    referralCode: {
      type: String,
      default: null,
    },
    // Cancellation
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
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

