const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user ID'],
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: false, // Optional for custom quiz room attempts
      default: null,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: false, // Optional for custom quiz room attempts
      default: null,
    },
    // Daily Challenge ID - if this attempt is for a daily challenge
    dailyChallengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyChallenge',
      required: false,
      default: null,
    },
    // Quiz Room ID - if this attempt is for a quiz room
    quizRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizRoom',
      required: false,
      default: null,
    },
    // Answers submitted by user
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        selectedOption: {
          type: String,
          enum: ['A', 'B', 'C', 'D', null],
          default: null,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        marksObtained: {
          type: Number,
          default: 0,
        },
        timeSpent: {
          type: Number, // Time in seconds
          default: 0,
        },
      },
    ],
    // Test attempt status
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'abandoned'],
      default: 'in-progress',
    },
    // Timing information
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    timeTaken: {
      type: Number, // Time taken in seconds
      default: 0,
    },
    // Results
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number, // Percentage
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    wrongAnswers: {
      type: Number,
      default: 0,
    },
    skippedAnswers: {
      type: Number,
      default: 0,
    },
    // Rank (placeholder for future implementation)
    rank: {
      type: Number,
      default: null,
    },
    // Power-ups used during test
    powerUpsUsed: [{
      powerUpId: { type: String, required: true },
      type: { type: String, required: true },
      usedAt: { type: Date, default: Date.now },
      cost: { type: Number, default: 0 },
      context: { type: mongoose.Schema.Types.Mixed, default: {} },
    }],
    // Boosts active for this test
    boostsActive: [{
      powerUpId: { type: String, required: true },
      type: { type: String, required: true },
      effectValue: { type: Number, default: 1 },
      activatedAt: { type: Date, default: Date.now },
    }],
    // Gamification rewards
    gamificationRewards: {
      xp: { type: Number, default: 0 },
      coins: { type: Number, default: 0 },
      levelUp: { type: Boolean, default: false },
      newLevel: { type: Number, default: null },
      xpBonuses: {
        score: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        speed: { type: Number, default: 0 },
        perfect: { type: Number, default: 0 },
        firstAttempt: { type: Number, default: 0 },
      },
      coinBonuses: {
        score: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        level: { type: Number, default: 0 },
        perfect: { type: Number, default: 0 },
      },
    },
    // Section-wise results (future ready)
    sectionWiseResults: [
      {
        sectionName: String,
        score: Number,
        totalMarks: Number,
        correct: Number,
        wrong: Number,
        skipped: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
testAttemptSchema.index({ userId: 1, testId: 1 });
testAttemptSchema.index({ userId: 1, status: 1 });
testAttemptSchema.index({ testId: 1, score: -1 }); // For ranking
testAttemptSchema.index({ examId: 1 });
testAttemptSchema.index({ submittedAt: -1 });
testAttemptSchema.index({ userId: 1, dailyChallengeId: 1 }); // For daily challenge attempts
testAttemptSchema.index({ userId: 1, quizRoomId: 1 }); // For quiz room attempts
// Compound indexes for efficient querying by attempt type
testAttemptSchema.index({ userId: 1, testId: 1, quizRoomId: 1 }); // For filtering by attempt type
testAttemptSchema.index({ userId: 1, testId: 1, quizRoomId: 1, status: 1 }); // For completion checks by type

module.exports = mongoose.model('TestAttempt', testAttemptSchema);

