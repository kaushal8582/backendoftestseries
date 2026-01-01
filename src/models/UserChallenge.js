const mongoose = require('mongoose');

/**
 * User Challenge Progress Model
 * Tracks user's progress on daily challenges
 */
const userChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyChallenge',
      required: true,
    },
    // Progress towards target
    progress: {
      type: Number,
      default: 0,
    },
    // Is challenge completed
    isCompleted: {
      type: Boolean,
      default: false,
    },
    // Completion date
    completedAt: {
      type: Date,
      default: null,
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

// Compound index to ensure one challenge per user
userChallengeSchema.index({ userId: 1, challengeId: 1 }, { unique: true });
userChallengeSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model('UserChallenge', userChallengeSchema);

