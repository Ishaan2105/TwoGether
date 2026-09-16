const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateDuoInviteCode } = require('../utils/generateCode');

const duoRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    respondedAt: { type: Date, default: null },
  },
  { _id: false, timestamps: true }
);

const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: String,
      auth: String,
    },
    userAgent: String,
  },
  { _id: false }
);

const notificationPrefsSchema = new mongoose.Schema(
  {
    morningBriefing: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: '08:00' },
    },
    middayCheckin: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: '14:00' },
    },
    partnerNudges: { enabled: { type: Boolean, default: true } },
    emergencySOS: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: '21:00' },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_!#.-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    mustChangePassword: { type: Boolean, default: false },
    customTitle: { type: String, default: 'Habit Rookie' },
    timezone: { type: String, default: 'UTC' },

    // Duo affiliation — populated by the Duo pairing milestone
    duoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Duo', default: null, index: true },
    duoInviteCode: { type: String, unique: true, sparse: true },
    incomingDuoRequests: { type: [duoRequestSchema], default: [] },
    outgoingDuoRequests: { type: [duoRequestSchema], default: [] },

    // Personal progression
    personalXP: { type: Number, default: 0 },
    personalLevel: { type: Number, default: 1 },
    soloStreak: { type: Number, default: 0 },
    highestSoloStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },

    inventory: {
      streakShields: { type: Number, default: 0, min: 0 },
      themes: { type: [String], default: [] },
      titles: { type: [String], default: [] },
    },
    badges: {
      type: [
        {
          code: String,
          name: String,
          unlockedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
    notificationPrefs: { type: notificationPrefsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (!this.duoInviteCode) {
    this.duoInviteCode = generateDuoInviteCode();
  }
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);