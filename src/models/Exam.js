const mongoose = require('mongoose');
const { EXAM_CATEGORIES, EXAM_LANGUAGES, EXAM_STATUS } = require('../config/constants');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide exam title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please provide exam category'],
      trim: true,
    },
    language: {
      type: String,
      required: [true, 'Please provide exam language'],
      enum: Object.values(EXAM_LANGUAGES),
    },
    totalMarks: {
      type: Number,
      required: [true, 'Please provide total marks'],
      min: [1, 'Total marks must be at least 1'],
    },
    duration: {
      type: Number, // Duration in minutes
      required: [true, 'Please provide exam duration'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    status: {
      type: String,
      enum: Object.values(EXAM_STATUS),
      default: EXAM_STATUS.DRAFT,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Metadata
    totalTests: {
      type: Number,
      default: 0,
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

// Indexes
examSchema.index({ category: 1, status: 1 });
examSchema.index({ createdBy: 1 });
examSchema.index({ status: 1 });

module.exports = mongoose.model('Exam', examSchema);

