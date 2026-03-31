const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const validateRequestInput = (data) => {
  const errors = [];

  if (!data.car_ids || !Array.isArray(data.car_ids) || data.car_ids.length === 0)
    errors.push({ field: 'car_ids', message: 'Трябва да изберете поне един автомобил' });

  if (!data.start_date) errors.push({ field: 'start_date', message: 'Началната дата е задължителна' });
  if (!data.end_date) errors.push({ field: 'end_date', message: 'Крайната дата е задължителна' });

  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime())) errors.push({ field: 'start_date', message: 'Невалидна начална дата' });
    if (isNaN(end.getTime())) errors.push({ field: 'end_date', message: 'Невалидна крайна дата' });
    if (!isNaN(start.getTime()) && start < today)
      errors.push({ field: 'start_date', message: 'Началната дата не може да бъде в миналото' });
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end)
      errors.push({ field: 'end_date', message: 'Крайната дата трябва да е след началната' });
  }

  if (data.notes && data.notes.length > 1000)
    errors.push({ field: 'notes', message: 'Бележките не могат да надвишават 1000 символа' });

  return errors;
};

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

// ─── POST /api/requests  (create booking) ─────────────────────────────────────
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { template_id, car_ids, start_date, end_date, notes } = req.body;

  // Basic structural validation
  const validationErrors = validateRequestInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'Моля, поправете грешките във формата', code: ErrorCodes.VALIDATION_ERROR, details: validationErrors },
    });
  }

  const start = new Date(start_date);
  const end = new Date(end_date);

  // ── Step 1: Fetch the requested cars ────────────────────────────────────────
  const [cars] = await pool.query(
    'SELECT * FROM cars WHERE id IN (?)',
    [car_ids]
  );

  if (cars.length !== car_ids.length) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Един или повече от избраните автомобили не са намерени',
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'car_ids', message: 'Невалидно ID на автомобил' }],
      },
    });
  }

  // ── Step 2: Check available flag (permanently disabled cars) ─────────────────
  const permanentlyUnavailable = cars.filter(c => !c.available);
  if (permanentlyUnavailable.length > 0) {
    const names = permanentlyUnavailable.map(c => `${c.brand} ${c.model}`).join(', ');
    return res.status(400).json({
      success: false,
      error: {
        message: `Следните автомобили не са налични: ${names}`,
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'car_ids', message: `Не е наличен: ${names}` }],
      },
    });
  }

  // ── Step 3: Check maintenance window overlap for the requested period ─────────
  //
  // A car is blocked by maintenance if:
  //   unavailable_from < requested_end_date
  //   AND unavailable_until >= requested_start_date
  //
  const maintenanceBlocked = cars.filter(c =>
    c.unavailable_from &&
    c.unavailable_until &&
    c.unavailable_from < end_date &&
    c.unavailable_until >= start_date
  );

  if (maintenanceBlocked.length > 0) {
    const details = maintenanceBlocked.map(c => {
      const reason = c.unavailable_reason || 'Техническа поддръжка';
      const until = c.unavailable_until;
      return `${c.brand} ${c.model} (${reason} до ${until})`;
    }).join('; ');

    return res.status(400).json({
      success: false,
      error: {
        message: `Следните автомобили са в поддръжка за избрания период: ${details}`,
        code: ErrorCodes.INVALID_VALUE,
        details: maintenanceBlocked.map(c => ({
          field: 'car_ids',
          message: `${c.brand} ${c.model} е в поддръжка до ${c.unavailable_until}`,
        })),
      },
    });
  }

  // ── Step 4: Check booking overlap for the requested period ────────────────────
  //
  // If any of the requested cars already have an active booking that overlaps:
  //   existing.start_date < requested_end_date
  //   AND existing.end_date > requested_start_date
  //
  const [conflictRows] = await pool.query(
    `SELECT rc.car_id, c.brand, c.model, rr.end_date
     FROM   request_cars rc
     JOIN   rental_requests rr ON rr.id = rc.request_id
     JOIN   cars c              ON c.id  = rc.car_id
     WHERE  rc.car_id  IN (?)
       AND  rr.status IN ('pending', 'approved')
       AND  rr.start_date < ?
       AND  rr.end_date   > ?`,
    [car_ids, end_date, start_date]
  );

  if (conflictRows.length > 0) {
    const details = conflictRows.map(r =>
      `${r.brand} ${r.model} (заета до ${r.end_date})`
    ).join('; ');

    return res.status(400).json({
      success: false,
      error: {
        message: `Следните автомобили вече са резервирани за избрания период: ${details}`,
        code: ErrorCodes.INVALID_VALUE,
        details: conflictRows.map(r => ({
          field: 'car_ids',
          message: `${r.brand} ${r.model} е вече резервиран за тези дати`,
        })),
      },
    });
  }

  // ── Step 5: Calculate price ───────────────────────────────────────────────────
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const basePrice = cars.reduce((sum, c) => sum + parseFloat(c.price_per_day), 0);

  let discount = 0;
  if (template_id) {
    const [templates] = await pool.query('SELECT * FROM templates WHERE id = ?', [template_id]);
    if (templates.length > 0) discount = templates[0].discount_percent || 0;
  }

  const totalPrice = basePrice * days * (1 - discount / 100);

  // ── Step 6: Persist ───────────────────────────────────────────────────────────
  const [result] = await pool.query(
    'INSERT INTO rental_requests (user_id, template_id, start_date, end_date, total_price, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, template_id || null, start_date, end_date, totalPrice.toFixed(2), notes || null]
  );

  for (const car_id of car_ids) {
    await pool.query(
      'INSERT INTO request_cars (request_id, car_id) VALUES (?, ?)',
      [result.insertId, car_id]
    );
  }

  res.status(201).json({
    success: true,
    message: 'Заявката е създадена успешно',
    id: result.insertId,
    total_price: totalPrice.toFixed(2),
  });
}));

// ─── GET /api/requests/my ─────────────────────────────────────────────────────
router.get('/my', requireAuth, asyncHandler(async (req, res) => {
  const [requests] = await pool.query(
    `SELECT rr.*, t.name AS template_name
     FROM   rental_requests rr
     LEFT JOIN templates t ON rr.template_id = t.id
     WHERE  rr.user_id = ?
     ORDER  BY rr.created_at DESC`,
    [req.user.id]
  );

  for (const request of requests) {
    const [cars] = await pool.query(
      `SELECT c.* FROM cars c
       JOIN request_cars rc ON c.id = rc.car_id
       WHERE rc.request_id = ?`,
      [request.id]
    );
    request.cars = cars;
  }

  res.json({ success: true, data: requests, count: requests.length });
}));

// ─── GET /api/requests  (admin) ───────────────────────────────────────────────
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.query;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалиден статус', code: ErrorCodes.INVALID_VALUE, details: [{ field: 'status', message: 'Невалиден статус' }] },
    });
  }

  let query = `
    SELECT rr.*, u.first_name, u.last_name, u.email, t.name AS template_name
    FROM   rental_requests rr
    LEFT JOIN users     u ON rr.user_id     = u.id
    LEFT JOIN templates t ON rr.template_id = t.id`;

  const params = [];
  if (status) { query += ' WHERE rr.status = ?'; params.push(status); }
  query += ' ORDER BY rr.created_at DESC';

  const [requests] = await pool.query(query, params);

  for (const request of requests) {
    const [cars] = await pool.query(
      `SELECT c.* FROM cars c
       JOIN request_cars rc ON c.id = rc.car_id
       WHERE rc.request_id = ?`,
      [request.id]
    );
    request.cars = cars;
  }

  res.json({ success: true, data: requests, count: requests.length });
}));

// ─── PATCH /api/requests/:id/status  (admin) ──────────────────────────────────
router.patch('/:id/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { status } = req.body;

  if (isNaN(requestId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });
  if (!status)
    return res.status(400).json({ success: false, error: { message: 'Статусът е задължителен', code: ErrorCodes.VALIDATION_ERROR, details: [{ field: 'status', message: 'Статусът е задължителен' }] } });
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ success: false, error: { message: 'Невалиден статус', code: ErrorCodes.INVALID_VALUE, details: [{ field: 'status', message: 'Невалиден статус' }] } });

  const [result] = await pool.query(
    'UPDATE rental_requests SET status = ? WHERE id = ?',
    [status, requestId]
  );

  if (!result.affectedRows)
    return res.status(404).json({ success: false, error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND } });

  res.json({ success: true, message: 'Статусът е обновен успешно' });
}));

// ─── GET /api/requests/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });

  let query = `
    SELECT rr.*, t.name AS template_name, u.first_name, u.last_name, u.email
    FROM   rental_requests rr
    LEFT JOIN templates t ON rr.template_id = t.id
    LEFT JOIN users     u ON rr.user_id     = u.id
    WHERE  rr.id = ?`;
  const params = [requestId];

  if (req.user.role !== 'admin') { query += ' AND rr.user_id = ?'; params.push(req.user.id); }

  const [requests] = await pool.query(query, params);
  if (!requests.length)
    return res.status(404).json({ success: false, error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND } });

  const request = requests[0];
  const [cars] = await pool.query(
    `SELECT c.* FROM cars c JOIN request_cars rc ON c.id = rc.car_id WHERE rc.request_id = ?`,
    [request.id]
  );
  request.cars = cars;

  res.json({ success: true, data: request });
}));

// ─── POST /api/requests/:id/cancel ───────────────────────────────────────────
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });

  const [requests] = await pool.query(
    'SELECT * FROM rental_requests WHERE id = ? AND user_id = ?',
    [requestId, req.user.id]
  );
  if (!requests.length)
    return res.status(404).json({ success: false, error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND } });

  if (requests[0].status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: { message: 'Може да отмените само чакащи заявки', code: ErrorCodes.INVALID_VALUE, details: [{ field: 'status', message: 'Може да отмените само чакащи заявки' }] },
    });
  }

  await pool.query('UPDATE rental_requests SET status = ? WHERE id = ?', ['cancelled', requestId]);
  res.json({ success: true, message: 'Заявката е отменена' });
}));

module.exports = router;
