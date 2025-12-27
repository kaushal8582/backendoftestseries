const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    // User who referred (referrer)
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide referrer ID'],
    },
    // User who was referred (referee)
    refereeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide referee ID'],
    },
    // Referral code used
    referralCode: {
      type: String,
      required: [true, 'Please provide referral code'],
      uppercase: true,
      trim: true,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Reward details
    referrerReward: {
      type: {
        type: String, // 'discount', 'cashback', 'free_plan'
        enum: ['discount', 'cashback', 'free_plan'],
        default: 'discount',
      },
      value: {
        type: Number,
        default: 0,
      },
      applied: {
        type: Boolean,
        default: false,
      },
      appliedAt: {
        type: Date,
        default: null,
      },
    },
    refereeReward: {
      type: {
        type: String,
        enum: ['discount', 'cashback', 'free_plan'],
        default: 'discount',
      },
      value: {
        type: Number,
        default: 0,
      },
      applied: {
        type: Boolean,
        default: false,
      },
      appliedAt: {
        type: Date,
        default: null,
      },
    },
    // When referee makes first payment
    completedAt: {
      type: Date,
      default: null,
    },
    // Payment that triggered completion
    triggerPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
referralSchema.index({ referrerId: 1 });
referralSchema.index({ refereeId: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1 });

module.exports = mongoose.model('Referral', referralSchema);

