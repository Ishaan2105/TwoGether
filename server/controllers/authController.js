const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const emailService = require('../services/emailService');

function firstValidationError(req) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return errors.array()[0].msg;
}

/**
 * Generate unique cool username suggestions using !, #, and other separators
 */
async function generateUsernameSuggestions(base) {
  const clean = base.replace(/[^a-z0-9_!#.-]/g, '').slice(0, 16);
  const candidates = [
    `${clean}!`,
    `${clean}#1`,
    `${clean}#duo`,
    `${clean}_x`,
    `${clean}!_`,
    `cool_${clean}`.slice(0, 20),
    `${clean}#tg`.slice(0, 20),
    `${clean}#2`,
    `${clean}!7`,
  ];

  const existingUsers = await User.find({ username: { $in: candidates } })
    .select('username')
    .lean();
  const existingSet = new Set(existingUsers.map((u) => u.username));

  return candidates.filter((c) => !existingSet.has(c) && c.length <= 20).slice(0, 4);
}

/**
 * POST /api/auth/register
 * Body: { username, email, password, confirmPassword }
 */
async function register(req, res, next) {
  try {
    const validationError = firstValidationError(req);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const username = String(req.body.username).trim().toLowerCase();
    const email = String(req.body.email).trim().toLowerCase();

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      if (existing.email === email) {
        return res.status(409).json({
          success: false,
          field: 'email',
          message: 'An account with this email is already in use.',
        });
      }
      if (existing.username === username) {
        const suggestions = await generateUsernameSuggestions(username);
        return res.status(409).json({
          success: false,
          field: 'username',
          message: `Username '${username}' is already taken. Try adding '!' or '#' to make it unique and cool, or pick one below!`,
          suggestions,
        });
      }
      return res.status(409).json({ success: false, message: 'Username or email already in use.' });
    }

    const user = await User.create({ username, email, password: req.body.password });
    const token = signToken(user._id);

    return res.status(201).json({ success: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/check-username?username=...
 * Checks username availability and provides cool suggestions if already taken
 */
async function checkUsername(req, res, next) {
  try {
    const raw = String(req.query.username || '').trim().toLowerCase();
    if (!raw || raw.length < 3) {
      return res.json({ success: true, available: true });
    }
    const exists = await User.findOne({ username: raw }).lean();
    if (exists) {
      const suggestions = await generateUsernameSuggestions(raw);
      return res.json({
        success: true,
        available: false,
        message: `Username '${raw}' is taken. Add '!' or '#' to make it unique:`,
        suggestions,
      });
    }
    return res.json({ success: true, available: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/predict-username?q=...
 * Provides live username predictions for autocomplete as user types during login
 */
async function predictUsername(req, res, next) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 1) {
      return res.json({ success: true, predictions: [] });
    }

    // Escape regex special characters so user typing ! or # doesn't break regex
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = await User.find({
      username: { $regex: '^' + escaped, $options: 'i' },
    })
      .select('username customTitle -_id')
      .limit(6)
      .lean();

    return res.json({ success: true, predictions: matches });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { identifier (email or username), password }
 */
async function login(req, res, next) {
  try {
    const validationError = firstValidationError(req);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const identifier = String(req.body.identifier).trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+password');

    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    return res.json({ success: true, data: { token, user } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me — protected; req.user is set by authMiddleware
 */
function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res, next) {
  try {
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address.',
      });
    }

    const user = await User.findOne({ email: rawEmail });
    if (!user) {
      // Respond gracefully to prevent email sniffing
      return res.json({
        success: true,
        message: 'If an account is registered with this email, a temporary password has been sent.',
      });
    }

    // Generate secure 8-character temporary password
    const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase();
    const tempPassword = `TG-${randomChars}`;

    // Update password (hashed via pre-save hook) and mark mustChangePassword
    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    // Send aesthetic HTML email
    await emailService.sendTemporaryPasswordEmail({
      toEmail: user.email,
      username: user.username,
      tempPassword,
    });

    return res.json({
      success: true,
      message: 'A temporary password has been sent to your email. Use it to log in and update your password in Settings.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/change-password
 * Protected
 * Body: { currentPassword, newPassword }
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    return res.json({
      success: true,
      message: 'Password updated successfully!',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
  checkUsername,
  predictUsername,
  generateUsernameSuggestions,
  forgotPassword,
  changePassword,
};