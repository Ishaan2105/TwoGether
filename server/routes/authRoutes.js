const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  me,
  checkUsername,
  predictUsername,
  forgotPassword,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const Habit = require('../models/Habit');
const Duo = require('../models/Duo');
const NudgeMessage = require('../models/NudgeMessage');

const router = express.Router();

router.get('/check-username', checkUsername);
router.get('/predict-username', predictUsername);

router.post(
  '/register',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3–20 characters')
      .matches(/^[a-zA-Z0-9_!#.-]+$/)
      .withMessage('Username can contain letters, numbers, _, !, #, . or -'),
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail()],
  forgotPassword
);


router.get('/me', protect, me);

/**
 * PATCH /api/auth/update-username
 * Body: { username: string }
 * Authenticated — updates the current user's username.
 */
router.patch(
  '/update-username',
  protect,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3–20 characters')
      .matches(/^[a-zA-Z0-9_!#.-]+$/)
      .withMessage('Username can contain letters, numbers, _, !, #, . or -'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const { username } = req.body;
      // Check uniqueness
      const taken = await User.findOne({ username, _id: { $ne: req.user._id } }).lean();
      if (taken) {
        return res.status(409).json({ success: false, message: 'Username is already taken.' });
      }
      const updated = await User.findByIdAndUpdate(
        req.user._id,
        { username },
        { new: true, runValidators: true }
      ).select('-password -pushSubscriptions');
      res.json({ success: true, data: { user: updated, message: 'Username updated!' } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/auth/change-password
 * Body: { currentPassword, newPassword, confirmNewPassword }
 * Authenticated — changes the current user's password.
 */
router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
    body('confirmNewPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('New passwords do not match'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Existing password is incorrect.' });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password cannot be the same as your current password.',
        });
      }

      user.password = newPassword;
      user.mustChangePassword = false; // Clear temporary password flag
      await user.save();

      return res.json({ success: true, message: 'Password successfully updated!' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/auth/delete-account
 * Body: { password, confirmPassword }
 * Authenticated — permanently removes user and all their data from the database.
 */
router.delete(
  '/delete-account',
  protect,
  [
    body('password').notEmpty().withMessage('Current password is required'),
    body('confirmPassword').notEmpty().withMessage('Please confirm your current password'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'The two entered passwords do not match.',
        });
      }

      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Password is incorrect.' });
      }

      const userId = user._id;

      // 1. Clean up Duo if exists
      if (user.duoId) {
        const duo = await Duo.findById(user.duoId);
        if (duo) {
          const partnerId = duo.users.find(
            (u) => (u._id ? u._id.toString() : u.toString()) !== userId.toString()
          );
          if (partnerId) {
            await User.findByIdAndUpdate(partnerId, { duoId: null });
          }
          await Duo.findByIdAndDelete(user.duoId);
        }
      }

      // 2. Remove pending duo requests referencing this user in any other user
      await User.updateMany(
        {},
        {
          $pull: {
            incomingDuoRequests: { userId },
            outgoingDuoRequests: { userId },
          },
        }
      );

      // 3. Delete habits
      await Habit.deleteMany({ userId });

      // 4. Delete nudges sent to or from this user
      await NudgeMessage.deleteMany({
        $or: [{ senderId: userId }, { recipientId: userId }],
      });

      // 5. Delete the user document permanently
      await User.findByIdAndDelete(userId);

      return res.json({
        success: true,
        message: 'Your account and all associated data have been permanently deleted.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;