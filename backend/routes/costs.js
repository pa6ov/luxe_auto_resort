const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Моите разходи (клиент)
router.get('/my', requireAuth, async (req, res) => {
  try {
    const [expenses] = await pool.query(
      `SELECT rr.*, t.name as template_name 
       FROM rental_requests rr 
       LEFT JOIN templates t ON rr.template_id = t.id 
       WHERE rr.user_id = ? AND rr.status IN ('approved', 'completed')
       ORDER BY rr.created_at DESC`,
      [req.user.id]
    );

    // Добавяне на автомобили
    for (const expense of expenses) {
      const [cars] = await pool.query(
        `SELECT c.brand, c.model FROM cars c 
         JOIN request_cars rc ON c.id = rc.car_id 
         WHERE rc.request_id = ?`,
        [expense.id]
      );
      expense.cars = cars;
    }

    // Изчисляване на обща сума
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.total_price), 0);

    res.json({ expenses, total_spent: totalSpent.toFixed(2) });
  } catch (error) {
    console.error('Get my costs error:', error);
    res.status(500).json({ error: 'Грешка при извличане на разходи' });
  }
});

// Разходи по клиенти (админ)
router.get('/clients', requireAuth, requireAdmin, async (req, res) => {
  try {
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

    res.json(clientCosts);
  } catch (error) {
    console.error('Get client costs error:', error);
    res.status(500).json({ error: 'Грешка при извличане на разходи' });
  }
});

module.exports = router;

