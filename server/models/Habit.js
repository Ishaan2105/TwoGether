const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      default: 'Productivity',
      trim: true,
      maxlength: [40, 'Category name cannot exceed 40 characters'],
    },
    icon: {
      type: String,
      default: '🎯',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    timeOfDay: {
      type: String,
      enum: ['anytime', 'morning', 'afternoon', 'evening'],
      default: 'anytime',
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    highestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedDates: {
      type: [String], // Array of 'YYYY-MM-DD' strings
      default: [],
    },
    xpReward: {
      type: Number,
      default: 15,
    },
    // Habit Lifecycle & Time-Bound Options
    habitType: {
      type: String,
      enum: ['ongoing', 'sprint'],
      default: 'ongoing',
    },
    startDate: {
      type: String, // 'YYYY-MM-DD'
      default: function () {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },
    },
    endDate: {
      type: String, // 'YYYY-MM-DD'
      default: null,
    },
    targetDays: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    closedAt: {
      type: Date,
      default: null,
    },
    finalAccuracy: {
      type: Number,
      default: null,
    },
    objectiveNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if completed on specific date
habitSchema.methods.isCompletedOn = function (dateStr) {
  return this.completedDates.includes(dateStr);
};

module.exports = mongoose.model('Habit', habitSchema);
