const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Моите разходи (клиент)
router.get('/my', requireAuth, asyncHandler(async (req, res) => {
  const [expenses] = await pool.query(
    `SELECT rr.*, t.name as template_name 
     FROM rental_requests rr 
     LEFT JOIN templates t ON rr.template_id = t.id 
     WHERE rr.user_id = ? AND rr.status IN ('approved', 'completed')
     ORDER BY rr.created_at DESC`,
    [req.user.id]
  );

  // Add cars to each expense
  for (const expense of expenses) {
    const [cars] = await pool.query(
      `SELECT c.brand, c.model FROM cars c 
       JOIN request_cars rc ON c.id = rc.car_id 
       WHERE rc.request_id = ?`,
      [expense.id]
    );
    expense.cars = cars;
  }

  // Calculate total
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.total_price), 0);

  res.json({
    success: true,
    data: expenses,
    total_spent: totalSpent.toFixed(2),
    count: expenses.length
  });
}));

// Разходи по клиенти (админ)
router.get('/clients', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const [clientCosts] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, 
            COUNT(rr.id) as total_requests,
            COALESCE(SUM(rr.total_price), 0) as total_spent
     FROM users u
     LEFT JOIN rental_requests rr ON u.id = rr.user_id AND rr.status IN ('approved', 'completed')
     WHERE u.role = 'client'
     GROUP BY u.id
     ORDER BY total_spent DESC`,
    []
  );

  res.json({
    success: true,
    data: clientCosts,
    count: clientCosts.length
  });
}));

module.exports = router;

