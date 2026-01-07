const mongoose = require('mongoose');

/**
 * Daily Challenge Model
 * Stores daily challenges that are available for users
 */
const dailyChallengeSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    challengeType: {
      type: String,
      enum: ['daily_test', 'accuracy', 'speed', 'category_focus', 'streak'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // Challenge target (e.g., 85 for 85% accuracy)
    target: {
      type: Number,
      required: true,
    },
    // Target category (for category_focus type)
    targetCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    // Target test (for daily_test type)
    targetTest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      default: null,
    },
    // Rewards
    reward: {
      xp: { type: Number, default: 50 },
      coins: { type: Number, default: 50 },
    },
    // Participants count
    participantsCount: {
      type: Number,
      default: 0,
    },
    // Completion count
    completionsCount: {
      type: Number,
      default: 0,
    },
    // Exam IDs - challenges valid for these exams (empty = all exams)
    examIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one challenge per type per date
dailyChallengeSchema.index({ date: 1, challengeType: 1 }, { unique: true });
dailyChallengeSchema.index({ date: 1, isActive: 1 });

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);

