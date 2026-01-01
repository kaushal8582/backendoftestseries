const mongoose = require('mongoose');

/**
 * User Achievement Model
 * Tracks which achievements each user has unlocked
 */
const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    achievementId: {
      type: String,
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    // For progressive achievements
    progress: {
      type: Number,
      default: 0,
    },
    isUnlocked: {
      type: Boolean,
      default: false,
    },
    // Reward claimed
    rewardClaimed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one achievement per user
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, isUnlocked: 1 });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);

