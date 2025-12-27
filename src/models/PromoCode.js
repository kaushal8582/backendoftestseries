const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide promo code'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]+$/, 'Promo code can only contain letters and numbers'],
    },
    name: {
      type: String,
      required: [true, 'Please provide promo code name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Discount type: 'percentage' or 'fixed'
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Please provide discount type'],
    },
    // Discount value
    discountValue: {
      type: Number,
      required: [true, 'Please provide discount value'],
      min: [0, 'Discount value cannot be negative'],
    },
    // Maximum discount amount (for percentage)
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    // Minimum order amount to apply
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    // Valid from
    validFrom: {
      type: Date,
      required: [true, 'Please provide valid from date'],
    },
    // Valid until
    validUntil: {
      type: Date,
      required: [true, 'Please provide valid until date'],
    },
    // Usage limits
    maxUsage: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    // Per user usage limit
    maxUsagePerUser: {
      type: Number,
      default: 1,
    },
    // Applicable plans (empty array means all plans)
    applicablePlans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
      },
    ],
    // Is active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Created by admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1 });
promoCodeSchema.index({ validFrom: 1, validUntil: 1 });

// Method to check if promo code is valid
promoCodeSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    this.usedCount < (this.maxUsage || Infinity) &&
    now >= this.validFrom &&
    now <= this.validUntil
  );
};

// Method to calculate discount
promoCodeSchema.methods.calculateDiscount = function (orderAmount) {
  if (orderAmount < this.minOrderAmount) {
    return 0;
  }

  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = this.discountValue;
  }

  return Math.min(discount, orderAmount);
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);

