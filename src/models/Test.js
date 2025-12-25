const mongoose = require('mongoose');

const testSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: [true, 'Please provide test name'],
      trim: true,
      maxlength: [200, 'Test name cannot be more than 200 characters'],
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Please provide exam ID'],
    },
    totalQuestions: {
      type: Number,
      required: [true, 'Please provide total questions'],
      min: [1, 'Total questions must be at least 1'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Please provide total marks'],
      min: [1, 'Total marks must be at least 1'],
    },
    duration: {
      type: Number, // Duration in minutes
      required: [true, 'Please provide test duration'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: [true, 'Please provide test order'],
      min: [1, 'Order must be at least 1'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    instructions: {
      type: String,
      trim: true,
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
testSchema.index({ examId: 1, order: 1 });
testSchema.index({ examId: 1, isActive: 1 });
testSchema.index({ isFree: 1 });

// Compound index for unique test order within exam
testSchema.index({ examId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Test', testSchema);

