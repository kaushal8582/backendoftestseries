const mongoose = require('mongoose');

const customQuestionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizRoom',
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    questionTextHindi: {
      type: String,
      trim: true,
    },
    options: {
      A: { type: String, required: true, trim: true },
      B: { type: String, required: true, trim: true },
      C: { type: String, required: true, trim: true },
      D: { type: String, required: true, trim: true },
    },
    optionsHindi: {
      A: { type: String, trim: true },
      B: { type: String, trim: true },
      C: { type: String, trim: true },
      D: { type: String, trim: true },
    },
    correctOption: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
      uppercase: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
    explanationHindi: {
      type: String,
      trim: true,
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
      min: [0, 'Marks cannot be negative'],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be negative'],
    },
    order: {
      type: Number,
      required: true,
      min: [1, 'Order must be at least 1'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customQuestionSchema.index({ roomId: 1, order: 1 });
customQuestionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('CustomQuestion', customQuestionSchema);

