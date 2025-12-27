const mongoose = require('mongoose');

/**
 * Subscription Plan Model (Future Ready)
 * This model is prepared for future subscription/payment integration
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide plan name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Plan type: free, basic, premium, lifetime
    planType: {
      type: String,
      enum: ['free', 'basic', 'premium', 'lifetime'],
      required: [true, 'Please provide plan type'],
    },
    // Duration in days (e.g., 30 for 1 month, 365 for 1 year, null for lifetime)
    duration: {
      type: Number,
      required: function() {
        return this.planType !== 'lifetime';
      },
      min: [1, 'Duration must be at least 1 day'],
      default: null,
    },
    // Display label (e.g., "1 Month", "2 Months", "1 Year", "2 Years")
    durationLabel: {
      type: String,
      required: [true, 'Please provide duration label'],
      trim: true,
    },
    price: {
      type: Number,
      required: function() {
        return this.planType !== 'free';
      },
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Trial period in days
    trialPeriod: {
      type: Number,
      default: 0,
      min: [0, 'Trial period cannot be negative'],
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    // Order for display
    order: {
      type: Number,
      default: 0,
    },
    // Is popular/recommended
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Razorpay plan ID (if created in Razorpay)
    razorpayPlanId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionPlanSchema.index({ isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

