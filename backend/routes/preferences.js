const express = require('express');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Получаване на предпочитания за филтри
router.get('/:filterType', requireAuth, asyncHandler(async (req, res) => {
  const { filterType } = req.params;

  const [preferences] = await pool.query(
    'SELECT filter_data FROM user_filter_preferences WHERE user_id = ? AND filter_type = ?',
    [req.user.id, filterType]
  );

  res.json({
    success: true,
    data: preferences.length > 0 ? JSON.parse(preferences[0].filter_data) : null
  });
}));

// Запазване на предпочитания за филтри
router.post('/:filterType', requireAuth, asyncHandler(async (req, res) => {
  const { filterType } = req.params;
  const { filterData } = req.body;

  if (!filterData || typeof filterData !== 'object') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидни данни за филтри',
        code: ErrorCodes.VALIDATION_ERROR
      }
    });
  }

  // Upsert - insert or update
  await pool.query(
    `INSERT INTO user_filter_preferences (user_id, filter_type, filter_data)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE filter_data = VALUES(filter_data), updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, filterType, JSON.stringify(filterData)]
  );

  res.json({
    success: true,
    message: 'Предпочитанията са запазени'
  });
}));

// Изтриване на предпочитания
router.delete('/:filterType', requireAuth, asyncHandler(async (req, res) => {
  const { filterType } = req.params;

  await pool.query(
    'DELETE FROM user_filter_preferences WHERE user_id = ? AND filter_type = ?',
    [req.user.id, filterType]
  );

  res.json({
    success: true,
    message: 'Предпочитанията са изтрити'
  });
}));

module.exports = router;
