const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// ── Validation ─────────────────────────────────────────────────────────────

const validateCarInput = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!data.brand)         errors.push({ field: 'brand',         message: 'Марката е задължителна' });
    if (!data.model)         errors.push({ field: 'model',         message: 'Моделът е задължителен' });
    if (!data.year)          errors.push({ field: 'year',          message: 'Годината е задължителна' });
    if (!data.price_per_day) errors.push({ field: 'price_per_day', message: 'Цената на ден е задължителна' });
  }

  if (data.year) {
    const year = parseInt(data.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
      errors.push({ field: 'year', message: 'Невалидна година' });
    }
  }
  if (data.price_per_day) {
    const price = parseFloat(data.price_per_day);
    if (isNaN(price) || price <= 0) {
      errors.push({ field: 'price_per_day', message: 'Цената трябва да е положително число' });
    }
  }
  if (data.seats) {
    const seats = parseInt(data.seats);
    if (isNaN(seats) || seats < 1 || seats > 50) {
      errors.push({ field: 'seats', message: 'Броят на местата трябва да е между 1 и 50' });
    }
  }
  if (data.license_plate && !/^[А-ЯA-Z0-9\s\-]{4,15}$/i.test(data.license_plate)) {
    errors.push({ field: 'license_plate', message: 'Невалиден формат на регистрационен номер' });
  }

  return errors;
};

// ── Audit log helper (same signature as in requests.js) ─────────────────────

async function writeAuditLog(adminId, action, tableName, recordId, previousValues, newValues) {
  try {
    await pool.query(
      `INSERT INTO audit_log
         (admin_id, action, table_name, record_id, previous_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, action, tableName, recordId,
       JSON.stringify(previousValues), JSON.stringify(newValues)]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/cars — public, with filters & sort
router.get('/', asyncHandler(async (req, res) => {
  const { brand, type, min_price, max_price, available, sort } = req.query;

  let query = 'SELECT * FROM cars WHERE 1=1';
  const params = [];

  if (brand) {
    query += ' AND brand LIKE ?';
    params.push(`%${brand}%`);
  }
  if (type) {
    const validTypes = ['sedan', 'suv', 'coupe', 'minivan', 'truck', 'sport'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Невалиден тип автомобил', code: ErrorCodes.INVALID_VALUE }
      });
    }
    query += ' AND type = ?';
    params.push(type);
  }
  if (min_price) {
    const v = parseFloat(min_price);
    if (isNaN(v) || v < 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Невалидна минимална цена', code: ErrorCodes.INVALID_VALUE }
      });
    }
    query += ' AND price_per_day >= ?';
    params.push(v);
  }
  if (max_price) {
    const v = parseFloat(max_price);
    if (isNaN(v) || v < 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Невалидна максимална цена', code: ErrorCodes.INVALID_VALUE }
      });
    }
    query += ' AND price_per_day <= ?';
    params.push(v);
  }
  if (available === 'true') query += ' AND available = TRUE';

  switch (sort) {
    case 'price_asc':  query += ' ORDER BY price_per_day ASC';  break;
    case 'price_desc': query += ' ORDER BY price_per_day DESC'; break;
    case 'year_desc':  query += ' ORDER BY year DESC';          break;
    case 'brand':      query += ' ORDER BY brand, model';       break;
    default:           query += ' ORDER BY id';
  }

  const [cars] = await pool.query(query, params);
  res.json({ success: true, data: cars, count: cars.length });
}));

// GET /api/cars/:id — public
router.get('/:id', asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на автомобил', code: ErrorCodes.INVALID_VALUE }
    });
  }

  const [cars] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
  if (cars.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND }
    });
  }
  res.json({ success: true, data: cars[0] });
}));

// POST /api/cars — admin creates car
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const validationErrors = validateCarInput(req.body, false);
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

  const {
    brand, model, year, license_plate, price_per_day, type, seats,
    transmission, fuel_type, mileage, image_url, description, available
  } = req.body;

  const [result] = await pool.query(
    `INSERT INTO cars
       (brand, model, year, license_plate, price_per_day, type, seats,
        transmission, fuel_type, mileage, image_url, description, available)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [brand, model, year, license_plate || null, price_per_day,
     type || 'sedan', seats || 5, transmission || 'automatic', fuel_type || 'petrol',
     mileage || 0, image_url || null, description || null, available !== false]
  );

  await writeAuditLog(req.user.id, 'CREATE_CAR', 'cars', result.insertId, null, req.body);

  res.status(201).json({
    success: true,
    message: 'Автомобилът е създаден успешно',
    id: result.insertId
  });
}));

// PUT /api/cars/:id — admin updates car
// If `available` changes to FALSE, returns a `conflicts` warning when
// active bookings exist for this car (Task 2 — conflict resolution).
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на автомобил', code: ErrorCodes.INVALID_VALUE }
    });
  }

  const validationErrors = validateCarInput(req.body, true);
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

  // Fetch current state for audit log and conflict detection
  const [prev] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
  if (prev.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND }
    });
  }

  const {
    brand, model, year, license_plate, price_per_day, type, seats,
    transmission, fuel_type, mileage, image_url, description, available
  } = req.body;

  // Detect maintenance conflict: car was available, now being set to unavailable
  let conflictingBookings = [];
  const goingUnavailable = prev[0].available && available === false;
  if (goingUnavailable) {
    const [conflicts] = await pool.query(
      `SELECT rr.id AS request_id, rr.start_date, rr.end_date,
              rr.status, u.first_name, u.last_name, u.email
       FROM request_cars rc
       JOIN rental_requests rr ON rc.request_id = rr.id
       JOIN users u ON rr.user_id = u.id
       WHERE rc.car_id = ? AND rr.status IN ('pending', 'approved')`,
      [carId]
    );
    conflictingBookings = conflicts;
  }

  const [result] = await pool.query(
    `UPDATE cars
     SET brand=?, model=?, year=?, license_plate=?, price_per_day=?,
         type=?, seats=?, transmission=?, fuel_type=?, mileage=?,
         image_url=?, description=?, available=?
     WHERE id=?`,
    [brand, model, year, license_plate, price_per_day, type, seats,
     transmission, fuel_type, mileage, image_url, description, available, carId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND }
    });
  }

  // Audit log
  const changedFields = {};
  const prevFields = {};
  const trackFields = ['brand','model','year','price_per_day','type','available'];
  for (const f of trackFields) {
    if (String(req.body[f]) !== String(prev[0][f])) {
      prevFields[f]    = prev[0][f];
      changedFields[f] = req.body[f];
    }
  }
  if (Object.keys(changedFields).length > 0) {
    await writeAuditLog(req.user.id, 'UPDATE_CAR', 'cars', carId, prevFields, changedFields);
  }

  const response = {
    success: true,
    message: 'Автомобилът е обновен успешно'
  };

  // Warn admin about conflicting bookings (Task 2 — conflict resolution)
  if (conflictingBookings.length > 0) {
    response.warning =
      `Автомобилът е маркиран като неналичен, но има ${conflictingBookings.length} активна/и резервация/и за него.`;
    response.conflicting_bookings = conflictingBookings;
  }

  res.json(response);
}));

// DELETE /api/cars/:id — admin deletes car (with audit log)
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на автомобил', code: ErrorCodes.INVALID_VALUE }
    });
  }

  const [prev] = await pool.query(
    'SELECT brand, model, year FROM cars WHERE id = ?', [carId]
  );

  const [result] = await pool.query('DELETE FROM cars WHERE id = ?', [carId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND }
    });
  }

  if (prev.length > 0) {
    await writeAuditLog(req.user.id, 'DELETE_CAR', 'cars', carId, prev[0], null);
  }

  res.json({ success: true, message: 'Автомобилът е изтрит успешно' });
}));

module.exports = router;
