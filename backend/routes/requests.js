const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');
const { validateTemplateDates } = require('../utils/templateDates');

const router = express.Router();

// ─── Validation helpers ────────────────────────────────────────────────────

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

const validateRequestInput = (data) => {
  const errors = [];

  if (!data.car_ids || !Array.isArray(data.car_ids) || data.car_ids.length === 0) {
    errors.push({ field: 'car_ids', message: 'Трябва да изберете поне един автомобил' });
  } else {
    const allIntegers = data.car_ids.every(id => Number.isInteger(Number(id)) && Number(id) > 0);
    if (!allIntegers) {
      errors.push({ field: 'car_ids', message: 'Невалидни ID-та на автомобили' });
    }
  }

  if (!data.start_date) {
    errors.push({ field: 'start_date', message: 'Началната дата е задължителна' });
  }
  if (!data.end_date) {
    errors.push({ field: 'end_date', message: 'Крайната дата е задължителна' });
  }

  if (data.notes && data.notes.length > 1000) {
    errors.push({ field: 'notes', message: 'Бележката не може да надвишава 1000 символа' });
  }

  return errors;
};

// ─── Overlap check ─────────────────────────────────────────────────────────

/**
 * Returns any car IDs from `carIds` that already have an approved/pending
 * request overlapping [startDate, endDate].
 * Optionally excludes a specific request ID (useful for edits).
 */
async function findOverlappingCars(carIds, startDate, endDate, excludeRequestId = null) {
  if (!carIds || carIds.length === 0) return [];

  let query = `
    SELECT DISTINCT rc.car_id, c.brand, c.model
    FROM request_cars rc
    JOIN rental_requests rr ON rc.request_id = rr.id
    JOIN cars c ON rc.car_id = c.id
    WHERE rc.car_id IN (?)
      AND rr.status IN ('pending', 'approved')
      AND rr.start_date < ?
      AND rr.end_date   > ?
  `;
  const params = [carIds, endDate, startDate];

  if (excludeRequestId) {
    query += ' AND rr.id != ?';
    params.push(excludeRequestId);
  }

  const [rows] = await pool.query(query, params);
  return rows; // [{ car_id, brand, model }, ...]
}

// ─── Server-side price calculation ─────────────────────────────────────────

async function calculatePrice(carIds, startDate, endDate, templateId) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const days  = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  const [cars] = await pool.query(
    'SELECT id, price_per_day FROM cars WHERE id IN (?)',
    [carIds]
  );

  const basePerDay = cars.reduce((sum, c) => sum + parseFloat(c.price_per_day), 0);

  let discount = 0;
  if (templateId) {
    const [templates] = await pool.query(
      'SELECT discount_percent FROM templates WHERE id = ? AND is_active = TRUE',
      [templateId]
    );
    if (templates.length > 0) {
      discount = parseFloat(templates[0].discount_percent) || 0;
    }
  }

  const totalPrice = basePerDay * days * (1 - discount / 100);
  return { days, basePerDay, discount, totalPrice: parseFloat(totalPrice.toFixed(2)) };
}

// ─── Audit log helper ───────────────────────────────────────────────────────

async function writeAuditLog(adminId, action, tableName, recordId, previousValues, newValues) {
  try {
    await pool.query(
      `INSERT INTO audit_log
         (admin_id, action, table_name, record_id, previous_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        action,
        tableName,
        recordId,
        JSON.stringify(previousValues),
        JSON.stringify(newValues)
      ]
    );
  } catch (err) {
    // Audit failures must never break the main request
    console.error('Audit log write failed:', err.message);
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────

// POST /api/requests — create a new rental request
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { template_id, car_ids, start_date, end_date, notes } = req.body;

  // 1. Basic field validation
  const validationErrors = validateRequestInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Моля, поправете грешките във формата',
        code: ErrorCodes.VALIDATION_ERROR,
        details: validationErrors
      }
    });
  }

  // 2. Template-date enforcement (Task 1 backend)
  let templateName = null;
  if (template_id) {
    const [tmpl] = await pool.query(
      'SELECT name FROM templates WHERE id = ? AND is_active = TRUE',
      [template_id]
    );
    if (tmpl.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Шаблонът не е намерен или е неактивен', code: ErrorCodes.NOT_FOUND }
      });
    }
    templateName = tmpl[0].name;
  }

  const dateCheck = validateTemplateDates(start_date, end_date, templateName);
  if (!dateCheck.valid) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Избраните дати не отговарят на изискванията на пакета',
        code: ErrorCodes.VALIDATION_ERROR,
        details: dateCheck.errors
      }
    });
  }

  // 3. Car availability — check available flag
  const normalizedIds = car_ids.map(Number);
  const [availableCars] = await pool.query(
    'SELECT * FROM cars WHERE id IN (?) AND available = TRUE',
    [normalizedIds]
  );
  if (availableCars.length !== normalizedIds.length) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Някои от избраните автомобили не са налични',
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'car_ids', message: 'Някои от избраните автомобили не са налични' }]
      }
    });
  }

  // 4. Date-overlap check (Task 2 backend)
  const overlapping = await findOverlappingCars(normalizedIds, start_date, end_date);
  if (overlapping.length > 0) {
    const names = overlapping.map(c => `${c.brand} ${c.model}`).join(', ');
    return res.status(409).json({
      success: false,
      error: {
        message: `Избраните дати се застъпват с вече съществуваща резервация за: ${names}`,
        code: 'DATE_OVERLAP',
        details: overlapping.map(c => ({
          field: 'car_ids',
          message: `${c.brand} ${c.model} вече е резервиран за тези дати`
        }))
      }
    });
  }

  // 5. Server-side price calculation — never trust the client (Task 2 backend)
  const { totalPrice } = await calculatePrice(normalizedIds, start_date, end_date, template_id);

  // 6. Persist
  const [result] = await pool.query(
    `INSERT INTO rental_requests
       (user_id, template_id, start_date, end_date, total_price, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, template_id || null, start_date, end_date, totalPrice, notes?.trim() || null]
  );

  for (const car_id of normalizedIds) {
    await pool.query(
      'INSERT INTO request_cars (request_id, car_id) VALUES (?, ?)',
      [result.insertId, car_id]
    );
  }

  res.status(201).json({
    success: true,
    message: 'Заявката е създадена успешно',
    id: result.insertId,
    total_price: totalPrice
  });
}));

// GET /api/requests/my — logged-in client's own requests
router.get('/my', requireAuth, asyncHandler(async (req, res) => {
  const [requests] = await pool.query(
    `SELECT rr.*, t.name as template_name
     FROM rental_requests rr
     LEFT JOIN templates t ON rr.template_id = t.id
     WHERE rr.user_id = ?
     ORDER BY rr.created_at DESC`,
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

// GET /api/requests — all requests (admin)
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.query;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалиден статус', code: ErrorCodes.INVALID_VALUE }
    });
  }

  let query = `
    SELECT rr.*, u.first_name, u.last_name, u.email, t.name as template_name
    FROM rental_requests rr
    LEFT JOIN users u ON rr.user_id = u.id
    LEFT JOIN templates t ON rr.template_id = t.id
  `;
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

// PATCH /api/requests/:id/status — admin changes status, with audit log
router.patch('/:id/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { status } = req.body;

  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на заявка', code: ErrorCodes.INVALID_VALUE }
    });
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалиден или липсващ статус',
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'status', message: 'Невалиден статус' }]
      }
    });
  }

  // Fetch previous state for audit log
  const [prev] = await pool.query(
    'SELECT status, user_id, start_date, end_date, total_price FROM rental_requests WHERE id = ?',
    [requestId]
  );
  if (prev.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND }
    });
  }

  const [result] = await pool.query(
    'UPDATE rental_requests SET status = ? WHERE id = ?',
    [status, requestId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND }
    });
  }

  // Write audit log (Task 2 — audit trail)
  await writeAuditLog(
    req.user.id,
    'UPDATE_STATUS',
    'rental_requests',
    requestId,
    { status: prev[0].status },
    { status }
  );

  res.json({ success: true, message: 'Статусът е обновен успешно' });
}));

// GET /api/requests/:id — single request detail
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на заявка', code: ErrorCodes.INVALID_VALUE }
    });
  }

  let query = `
    SELECT rr.*, t.name as template_name, u.first_name, u.last_name, u.email
    FROM rental_requests rr
    LEFT JOIN templates t ON rr.template_id = t.id
    LEFT JOIN users u ON rr.user_id = u.id
    WHERE rr.id = ?
  `;
  const params = [requestId];
  if (req.user.role !== 'admin') { query += ' AND rr.user_id = ?'; params.push(req.user.id); }

  const [requests] = await pool.query(query, params);
  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND }
    });
  }

  const request = requests[0];
  const [cars] = await pool.query(
    `SELECT c.* FROM cars c
     JOIN request_cars rc ON c.id = rc.car_id
     WHERE rc.request_id = ?`,
    [request.id]
  );
  request.cars = cars;

  res.json({ success: true, data: request });
}));

// POST /api/requests/:id/cancel — client cancels own pending request
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на заявка', code: ErrorCodes.INVALID_VALUE }
    });
  }

  const [requests] = await pool.query(
    'SELECT * FROM rental_requests WHERE id = ? AND user_id = ?',
    [requestId, req.user.id]
  );
  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Заявката не е намерена', code: ErrorCodes.NOT_FOUND }
    });
  }

  if (requests[0].status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Може да отмените само чакащи заявки',
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'status', message: 'Може да отмените само чакащи заявки' }]
      }
    });
  }

  await pool.query(
    'UPDATE rental_requests SET status = ? WHERE id = ?',
    ['cancelled', requestId]
  );

  res.json({ success: true, message: 'Заявката е отменена' });
}));

module.exports = router;
