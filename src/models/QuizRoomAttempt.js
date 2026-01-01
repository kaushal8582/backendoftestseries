const mongoose = require('mongoose');

const quizRoomAttemptSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizRoom',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestAttempt',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    rank: {
      type: Number,
      default: null,
    },
    timeTaken: {
      type: Number, // in seconds
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
    accuracy: {
      type: Number, // percentage
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index
quizRoomAttemptSchema.index({ roomId: 1, userId: 1 }, { unique: true });
quizRoomAttemptSchema.index({ roomId: 1, score: -1 }); // For ranking

module.exports = mongoose.model('QuizRoomAttempt', quizRoomAttemptSchema);

