const express = require('express');
const { body } = require('express-validator');
const {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabit,
  closeHabit,
  reopenHabit,
} = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All habit routes require authentication
router.use(protect);

router.get('/', getHabits);

router.post(
  '/',
  [body('title').trim().notEmpty().withMessage('Task title is required')],
  createHabit
);

router.put(
  '/:id',
  [body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')],
  updateHabit
);

router.delete('/:id', deleteHabit);

router.post('/:id/toggle', toggleHabit);
router.post('/:id/close', closeHabit);
router.post('/:id/reopen', reopenHabit);

module.exports = router;
