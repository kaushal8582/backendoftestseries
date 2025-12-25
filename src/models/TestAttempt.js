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
      required: [true, 'Please provide test ID'],
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Please provide exam ID'],
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

module.exports = mongoose.model('TestAttempt', testAttemptSchema);

