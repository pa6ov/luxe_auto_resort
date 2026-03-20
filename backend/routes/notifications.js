const express = require('express');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// Получаване на нотификации
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [notifications] = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: notifications,
    count: notifications.length
  });
}));

// Брой непрочетени нотификации
router.get('/unread-count', requireAuth, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );

  res.json({
    success: true,
    count: result[0].count
  });
}));

// Маркиране като прочетена
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const notificationId = parseInt(req.params.id);

  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [notificationId, req.user.id]
  );

  res.json({
    success: true,
    message: 'Нотификацията е маркирана като прочетена'
  });
}));

// Маркиране на всички като прочетени
router.patch('/mark-all-read', requireAuth, asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );

  res.json({
    success: true,
    message: 'Всички нотификации са маркирани като прочетени'
  });
}));

// Изтриване на нотификация
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const notificationId = parseInt(req.params.id);

  await pool.query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, req.user.id]
  );

  res.json({
    success: true,
    message: 'Нотификацията е изтрита'
  });
}));

module.exports = router;
