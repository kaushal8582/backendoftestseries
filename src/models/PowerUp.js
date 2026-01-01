const mongoose = require('mongoose');

/**
 * Power-Up Definition Model
 * Stores all available power-ups in the system
 */
const powerUpSchema = new mongoose.Schema(
  {
    powerUpId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: 'flash',
    },
    type: {
      type: String,
      enum: ['extra_time', 'hint', 'skip_question', 'fifty_fifty', 'double_xp'],
      required: true,
    },
    // Cost in coins
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    // Effect value (e.g., +5 minutes for extra_time)
    effectValue: {
      type: Number,
      default: 0,
    },
    // Can be used during test
    usableDuringTest: {
      type: Boolean,
      default: true,
    },
    // Can be used before test (boost)
    usableBeforeTest: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

powerUpSchema.index({ powerUpId: 1 });
powerUpSchema.index({ type: 1 });
powerUpSchema.index({ isActive: 1 });

module.exports = mongoose.model('PowerUp', powerUpSchema);

