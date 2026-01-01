const mongoose = require('mongoose');

/**
 * Achievement Definition Model
 * Stores all available achievements in the system
 */
const achievementSchema = new mongoose.Schema(
  {
    achievementId: {
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
      default: 'trophy',
    },
    category: {
      type: String,
      enum: ['test_completion', 'performance', 'streak', 'category_mastery', 'special'],
      required: true,
    },
    // For progressive achievements (e.g., complete 10 tests)
    target: {
      type: Number,
      default: 1,
    },
    // Rewards
    reward: {
      xp: { type: Number, default: 0 },
      coins: { type: Number, default: 0 },
    },
    // Achievement type
    type: {
      type: String,
      enum: ['one_time', 'progressive', 'recurring'],
      default: 'one_time',
    },
    // Conditions for unlocking (stored as JSON for flexibility)
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

achievementSchema.index({ achievementId: 1 });
achievementSchema.index({ category: 1 });
achievementSchema.index({ isActive: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);

