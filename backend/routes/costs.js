const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Моите разходи (клиент)
router.get('/my', requireAuth, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `SELECT rr.*, t.name as template_name
     FROM rental_requests rr
     LEFT JOIN templates t ON rr.template_id = t.id
     WHERE rr.user_id = ? AND rr.status IN ('approved', 'completed')`;
  const params = [req.user.id];

  if (start_date) {
    query += ' AND rr.start_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND rr.end_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY rr.created_at DESC';

  const [expenses] = await pool.query(query, params);

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
  const { start_date, end_date } = req.query;

  let query = `SELECT u.id, u.first_name, u.last_name, u.email,
            COUNT(rr.id) as total_requests,
            COALESCE(SUM(rr.total_price), 0) as total_spent
     FROM users u
     LEFT JOIN rental_requests rr ON u.id = rr.user_id AND rr.status IN ('approved', 'completed')`;

  const params = [];
  const conditions = ["u.role = 'client'"];

  if (start_date) {
    conditions.push('rr.start_date >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('rr.end_date <= ?');
    params.push(end_date);
  }

  query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY u.id ORDER BY total_spent DESC';

  const [clientCosts] = await pool.query(query, params);

  res.json({
    success: true,
    data: clientCosts,
    count: clientCosts.length
  });
}));

// Експорт на разходи - CSV (админ)
router.get('/export/csv', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `SELECT
      u.id as client_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      rr.id as request_id,
      rr.start_date,
      rr.end_date,
      rr.total_price,
      rr.status,
      rr.created_at,
      GROUP_CONCAT(DISTINCT CONCAT(c.brand, ' ', c.model) SEPARATOR '; ') as cars
    FROM users u
    JOIN rental_requests rr ON u.id = rr.user_id
    LEFT JOIN request_cars rc ON rr.id = rc.request_id
    LEFT JOIN cars c ON rc.car_id = c.id
    WHERE u.role = 'client'`;

  const params = [];

  if (start_date) {
    query += ' AND rr.start_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND rr.end_date <= ?';
    params.push(end_date);
  }

  query += ` GROUP BY rr.id ORDER BY rr.created_at DESC`;

  const [rows] = await pool.query(query, params);

  // Generate CSV
  const headers = ['Client ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Request ID', 'Start Date', 'End Date', 'Total Price', 'Status', 'Created At', 'Cars'];
  const csvContent = [
    headers.join(','),
    ...rows.map(r => [
      r.client_id,
      `"${r.first_name || ''}"`,
      `"${r.last_name || ''}"`,
      `"${r.email || ''}"`,
      `"${r.phone || ''}"`,
      r.request_id,
      r.start_date,
      r.end_date,
      r.total_price,
      r.status,
      r.created_at,
      `"${r.cars || ''}"`
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=costs_export.csv');
  res.send('\uFEFF' + csvContent); // BOM for Excel UTF-8 support
}));

// Статистика на разходи за дашборд
router.get('/stats', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { period } = req.query; // 'week', 'month', 'year'

  let dateFilter = '';
  switch (period) {
    case 'week':
      dateFilter = 'AND rr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      break;
    case 'month':
      dateFilter = 'AND rr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      break;
    case 'year':
      dateFilter = 'AND rr.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
      break;
  }

  const [stats] = await pool.query(
    `SELECT
      COUNT(*) as total_requests,
      COALESCE(SUM(rr.total_price), 0) as total_revenue,
      AVG(rr.total_price) as avg_price,
      COUNT(DISTINCT rr.user_id) as unique_clients
    FROM rental_requests rr
    WHERE rr.status IN ('approved', 'completed') ${dateFilter}`,
    []
  );

  // Revenue by month for charts
  const [monthlyRevenue] = await pool.query(
    `SELECT
      DATE_FORMAT(rr.created_at, '%Y-%m') as month,
      COALESCE(SUM(rr.total_price), 0) as revenue,
      COUNT(*) as requests
    FROM rental_requests rr
    WHERE rr.status IN ('approved', 'completed')
    GROUP BY DATE_FORMAT(rr.created_at, '%Y-%m')
    ORDER BY month DESC
    LIMIT 12`
  );

  res.json({
    success: true,
    data: {
      summary: stats[0],
      monthly_revenue: monthlyRevenue
    }
  });
}));

module.exports = router;

