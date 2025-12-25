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
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number, // Duration in days
      required: [true, 'Please provide plan duration'],
      min: [1, 'Duration must be at least 1 day'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide plan price'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    // For future: payment gateway integration fields
    // paymentGatewayId: String,
    // stripePriceId: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionPlanSchema.index({ isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

