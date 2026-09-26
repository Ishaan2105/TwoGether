const express = require('express');
const { body } = require('express-validator');
const {
  lookupCode,
  pairDuo,
  getMyDuo,
  sendNudge,
  unpairDuo,
  getDuoShells,
  getLeaderboards,
  evaluateStreak,
  triggerMidnightCron,
  getDuoCustomCategories,
  addDuoCustomCategory,
} = require('../controllers/duoController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All Duo routes require an authenticated user
router.use(protect);

router.get('/me', getMyDuo);
router.get('/shells', getDuoShells);
router.get('/leaderboards', getLeaderboards);

router.post(
  '/lookup',
  [body('code').trim().notEmpty().withMessage('Duo invite code is required')],
  lookupCode
);

router.post(
  '/pair',
  [body('code').trim().notEmpty().withMessage('Duo invite code is required')],
  pairDuo
);

router.post(
  '/nudge',
  [body('type').isIn(['hype', 'nudge', 'sos']).withMessage('Type must be hype, nudge, or sos')],
  sendNudge
);

router.post('/unpair', unpairDuo);

// Streak Engine endpoints
router.post('/evaluate-streak', evaluateStreak);
router.post('/midnight-cron', triggerMidnightCron);

// Custom shared categories (duo)
router.get('/custom-categories', getDuoCustomCategories);
router.post(
  '/custom-categories',
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  addDuoCustomCategory
);

module.exports = router;
