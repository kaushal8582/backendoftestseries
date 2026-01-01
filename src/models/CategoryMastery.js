const mongoose = require('mongoose');

/**
 * Category Mastery Model
 * Tracks user's mastery level in each category
 */
const categoryMasterySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    // Test completion stats
    testsCompleted: {
      type: Number,
      default: 0,
    },
    // Average score in this category
    averageScore: {
      type: Number,
      default: 0,
    },
    // Total score in this category
    totalScore: {
      type: Number,
      default: 0,
    },
    // Total marks attempted
    totalMarks: {
      type: Number,
      default: 0,
    },
    // Mastery level
    masteryLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    // Unlocked skills (array of skill IDs)
    unlockedSkills: [{
      type: String,
    }],
    // Progress percentage (0-100)
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Last updated
    lastTestDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one mastery per user per category
categoryMasterySchema.index({ userId: 1, categoryId: 1 }, { unique: true });
categoryMasterySchema.index({ userId: 1, masteryLevel: 1 });
categoryMasterySchema.index({ categoryId: 1, masteryLevel: 1 });

module.exports = mongoose.model('CategoryMastery', categoryMasterySchema);

