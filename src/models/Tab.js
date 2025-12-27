const mongoose = require('mongoose');

const tabSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide tab name'],
      trim: true,
      maxlength: [100, 'Tab name cannot be more than 100 characters'],
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Please provide exam ID'],
    },
    order: {
      type: Number,
      required: [true, 'Please provide tab order'],
      min: [1, 'Order must be at least 1'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tabSchema.index({ examId: 1, order: 1 });
tabSchema.index({ examId: 1, isActive: 1 });
tabSchema.index({ examId: 1, isDefault: 1 });

// Compound index for unique tab order within exam
tabSchema.index({ examId: 1, order: 1 }, { unique: true });

// Ensure only one default tab per exam
tabSchema.pre('save', async function (next) {
  if (this.isDefault && this.isNew) {
    // If this is being set as default, unset other defaults for this exam
    await mongoose.model('Tab').updateMany(
      { examId: this.examId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('Tab', tabSchema);

