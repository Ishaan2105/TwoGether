const mongoose = require('mongoose');

/**
 * Stores a nudge message (image + text) temporarily in MongoDB.
 * TTL index auto-deletes after 24 hours.
 */
const nudgeMessageSchema = new mongoose.Schema({
  fromUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromUsername: { type: String, required: true },
  imageDataUrl: { type: String, default: null }, // base64 JPEG, stored server-side
  imageSource:  { type: String, default: 'gallery' }, // 'camera' | 'gallery'
  message:      { type: String, default: '' },
  emoji:        { type: String, default: '👋' },
  viewed:       { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now, expires: 86400 }, // TTL: 24h
});

module.exports = mongoose.model('NudgeMessage', nudgeMessageSchema);
