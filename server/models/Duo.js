const mongoose = require('mongoose');

const nudgeSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['hype', 'nudge', 'sos'],
      default: 'nudge',
    },
    message: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const duoSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    duoName: {
      type: String,
      trim: true,
      default: 'Dynamic Duo',
    },
    duoStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    highestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    synergyScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    duoXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    duoLevel: {
      type: Number,
      default: 1,
      min: 1,
    },
    duoShields: {
      type: Number,
      default: 1,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'dissolved'],
      default: 'active',
    },
    formedAt: {
      type: Date,
      default: Date.now,
    },
    lastCompletedDate: {
      type: String,
      default: null,
    },
    nudges: {
      type: [nudgeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to calculate other partner
duoSchema.methods.getPartner = function (userId) {
  const currentUserIdStr = userId.toString();
  return this.users.find((u) => {
    const uid = u._id ? u._id.toString() : u.toString();
    return uid !== currentUserIdStr;
  });
};

module.exports = mongoose.model('Duo', duoSchema);
