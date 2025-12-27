const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user ID'],
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserSubscription',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Razorpay details
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ['initiated', 'clicked', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'initiated',
    },
    paymentMethod: {
      type: String,
      default: 'razorpay',
    },
    // Promo code applied
    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    // Referral code applied
    referralCode: {
      type: String,
      default: null,
    },
    referralDiscount: {
      type: Number,
      default: 0,
    },
    // Tracking timestamps
    paymentInitiatedAt: {
      type: Date,
      default: Date.now,
    },
    paymentClickedAt: {
      type: Date,
      default: null,
    },
    paymentCompletedAt: {
      type: Date,
      default: null,
    },
    paymentFailedAt: {
      type: Date,
      default: null,
    },
    // Failure reason
    failureReason: {
      type: String,
      default: null,
    },
    // Attempt tracking
    attemptNumber: {
      type: Number,
      default: 1,
    },
    // Webhook data
    webhookData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ subscriptionPlanId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

