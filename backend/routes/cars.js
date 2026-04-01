const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// ─── Input validation ─────────────────────────────────────────────────────────

const validateCarInput = (data, isUpdate = false) => {
  const errors = [];
  if (!isUpdate) {
    if (!data.brand) errors.push({ field: 'brand', message: 'Марката е задължителна' });
    if (!data.model) errors.push({ field: 'model', message: 'Моделът е задължителен' });
    if (!data.year) errors.push({ field: 'year', message: 'Годината е задължителна' });
    if (!data.price_per_day) errors.push({ field: 'price_per_day', message: 'Цената на ден е задължителна' });
  }
  if (data.year) {
    const y = parseInt(data.year);
    if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 2)
      errors.push({ field: 'year', message: 'Невалидна година' });
  }
  if (data.price_per_day) {
    const p = parseFloat(data.price_per_day);
    if (isNaN(p) || p <= 0)
      errors.push({ field: 'price_per_day', message: 'Цената трябва да е положително число' });
  }
  if (data.seats) {
    const s = parseInt(data.seats);
    if (isNaN(s) || s < 1 || s > 50)
      errors.push({ field: 'seats', message: 'Броят на местата трябва да е между 1 и 50' });
  }
  if (data.license_plate && !/^[А-ЯA-Z0-9\s\-]{4,15}$/i.test(data.license_plate))
    errors.push({ field: 'license_plate', message: 'Невалиден формат на регистрационен номер' });
  return errors;
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Today as 'YYYY-MM-DD' */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * isInMaintenanceWindow(car, onDate)
 * Returns true if the car's maintenance window covers the given date (inclusive).
 * onDate defaults to today.
 */
function isInMaintenanceWindow(car, onDate) {
  const d = onDate || todayStr();
  return !!(
    car.unavailable_from &&
    car.unavailable_until &&
    car.unavailable_from <= d &&
    car.unavailable_until >= d
  );
}

/**
 * maintenanceOverlaps(car, startDate, endDate)
 * Returns true if the car's maintenance window overlaps with [startDate, endDate).
 * Overlap: window.start < requested_end AND window.end >= requested_start
 */
function maintenanceOverlaps(car, startDate, endDate) {
  if (!car.unavailable_from || !car.unavailable_until) return false;
  return car.unavailable_from < endDate && car.unavailable_until >= startDate;
}

// ─── Core availability query ──────────────────────────────────────────────────

/**
 * getUnavailableCarIds(startDate, endDate)
 *
 * Returns Map<carId, { reason, until }> for every car blocked during
 * the period [startDate, endDate), considering:
 *   1. Active rental requests (pending | approved) that overlap the window
 *   2. Admin-set maintenance windows on the cars table that overlap the window
 *
 * Maintenance takes precedence over booking labels.
 */
async function getUnavailableCarIds(startDate, endDate) {
  const blocked = new Map();

  // 1. Rental-request overlaps
  const [bookingRows] = await pool.query(
    `SELECT rc.car_id,
            MAX(rr.end_date) AS until
     FROM   request_cars rc
     JOIN   rental_requests rr ON rr.id = rc.request_id
     WHERE  rr.status IN ('pending', 'approved')
       AND  rr.start_date < ?
       AND  rr.end_date   > ?
     GROUP  BY rc.car_id`,
    [endDate, startDate]
  );
  for (const row of bookingRows) {
    blocked.set(row.car_id, { reason: 'Заета', until: row.until });
  }

  // 2. Maintenance-window overlaps (takes precedence over booking label)
  const [maintRows] = await pool.query(
    `SELECT id                 AS car_id,
            unavailable_until  AS until,
            unavailable_reason AS reason
     FROM   cars
     WHERE  unavailable_from  IS NOT NULL
       AND  unavailable_until IS NOT NULL
       AND  unavailable_from  < ?
       AND  unavailable_until >= ?`,
    [endDate, startDate]
  );
  for (const row of maintRows) {
    blocked.set(row.car_id, {
      reason: row.reason || 'Техническа поддръжка',
      until: row.until,
    });
  }

  return blocked;
}

/**
 * nextAvailableDate(carId)
 *
 * Returns the earliest ISO date string when the car will next be free,
 * considering BOTH active bookings AND the maintenance window.
 * Returns null if the car is free right now.
 */
async function nextAvailableDate(carId) {
  const today = todayStr();
  const candidates = [];

  const [bookings] = await pool.query(
    `SELECT MAX(rr.end_date) AS until
     FROM   request_cars rc
     JOIN   rental_requests rr ON rr.id = rc.request_id
     WHERE  rc.car_id  = ?
       AND  rr.status IN ('pending', 'approved')
       AND  rr.end_date > ?`,
    [carId, today]
  );
  if (bookings[0]?.until) candidates.push(bookings[0].until);

  const [maint] = await pool.query(
    `SELECT unavailable_until AS until
     FROM   cars
     WHERE  id                = ?
       AND  unavailable_until IS NOT NULL
       AND  unavailable_until >= ?`,
    [carId, today]
  );
  if (maint[0]?.until) candidates.push(maint[0].until);

  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a > b ? a : b));
}

/**
 * findNextAvailableWindow(requestedDays)
 * Scans up to 90 days ahead for the first window where at least one car is free.
 */
async function findNextAvailableWindow(requestedDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 1; offset <= 90; offset++) {
    const tryStart = new Date(today);
    tryStart.setDate(today.getDate() + offset);
    const tryEnd = new Date(tryStart);
    tryEnd.setDate(tryStart.getDate() + requestedDays);

    const s = tryStart.toISOString().split('T')[0];
    const e = tryEnd.toISOString().split('T')[0];
    const bl = await getUnavailableCarIds(s, e);

    const [allCars] = await pool.query('SELECT id FROM cars WHERE available = TRUE');
    if (allCars.some(c => !bl.has(c.id))) return { start: s, end: e };
  }
  return null;
}

// ─── GET /api/cars ────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { brand, type, min_price, max_price, available, sort } = req.query;

  let blocked = new Map();

  // ── Date-filter validation ─────────────────────────────────────────────────
  // Date filter logic removed as per request

  // ── Base SQL ───────────────────────────────────────────────────────────────
  let query = 'SELECT * FROM cars WHERE 1=1';
  const params = [];

  if (brand) { query += ' AND brand LIKE ?'; params.push(`%${brand}%`); }
  if (type) {
    const validTypes = ['sedan', 'suv', 'coupe', 'minivan', 'truck', 'sport'];
    if (!validTypes.includes(type))
      return res.status(400).json({ success: false, error: { message: 'Невалиден тип автомобил', code: ErrorCodes.INVALID_VALUE } });
    query += ' AND type = ?'; params.push(type);
  }
  if (min_price) { query += ' AND price_per_day >= ?'; params.push(min_price); }
  if (max_price) { query += ' AND price_per_day <= ?'; params.push(max_price); }

  if (available === 'true') {
    query += ' AND available = TRUE';
  }

  switch (sort) {
    case 'price_asc': query += ' ORDER BY price_per_day ASC'; break;
    case 'price_desc': query += ' ORDER BY price_per_day DESC'; break;
    case 'year_desc': query += ' ORDER BY year DESC'; break;
    case 'brand': query += ' ORDER BY brand, model'; break;
    default: query += ' ORDER BY id';
  }

  const [cars] = await pool.query(query, params);
  const today = todayStr();

  // ── Enrich every car ───────────────────────────────────────────────────────
  const enriched = cars.map(car => {
    // Is the maintenance window active RIGHT NOW (regardless of date filter)?
    const inMaintToday = isInMaintenanceWindow(car, today);

    // ── effective_available ────────────────────────────────────────────────
    // This is the single authoritative field all frontend code should use.
    // A car is effectively available only when:
    //   1. available flag is TRUE (not permanently deactivated by admin)
    //   2. NOT in a maintenance window today
    let effectivelyAvailable = car.available && !inMaintToday;

    const maintInfo = {
      in_maintenance: inMaintToday,
      unavailable_from: car.unavailable_from || null,
      unavailable_until: car.unavailable_until || null,
      unavailable_reason: car.unavailable_reason || null,
    };
    return {
      ...car,
      ...maintInfo,
      // KEY FIX: expose current availability based on maintenance status
      effective_available: effectivelyAvailable,
    };
  });

  res.json({
    success: true,
    data: enriched,
    count: enriched.length,
  });
}));

// ─── GET /api/cars/:id ────────────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });

  const [cars] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
  if (!cars.length)
    return res.status(404).json({ success: false, error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND } });

  const car = cars[0];
  const today = todayStr();
  const inMaintNow = isInMaintenanceWindow(car, today);
  const nextFree = await nextAvailableDate(carId);

  res.json({
    success: true,
    data: {
      ...car,
      in_maintenance: inMaintNow,
      unavailable_reason: car.unavailable_reason || null,
      next_available_date: nextFree || null,
      // Single source of truth for all frontend rent-button logic
      effective_available: car.available && !inMaintNow && !nextFree,
    },
  });
}));

// ─── PATCH /api/cars/:id/availability  (admin) ────────────────────────────────
router.patch('/:id/availability', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });

  const { unavailable_from, unavailable_until, unavailable_reason } = req.body;
  const clearing = !unavailable_from && !unavailable_until;

  if (!clearing) {
    if (!unavailable_from || !unavailable_until) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Трябва да посочите и двете дати',
          code: ErrorCodes.VALIDATION_ERROR,
          details: [
            !unavailable_from ? { field: 'unavailable_from', message: 'Началната дата е задължителна' } : null,
            !unavailable_until ? { field: 'unavailable_until', message: 'Крайната дата е задължителна' } : null,
          ].filter(Boolean),
        },
      });
    }
    const from = new Date(unavailable_from);
    const until = new Date(unavailable_until);
    if (isNaN(from.getTime()))
      return res.status(400).json({ success: false, error: { message: 'Невалидна начална дата', code: ErrorCodes.VALIDATION_ERROR, details: [{ field: 'unavailable_from', message: 'Невалидна начална дата' }] } });
    if (isNaN(until.getTime()))
      return res.status(400).json({ success: false, error: { message: 'Невалидна крайна дата', code: ErrorCodes.VALIDATION_ERROR, details: [{ field: 'unavailable_until', message: 'Невалидна крайна дата' }] } });
    if (until <= from)
      return res.status(400).json({ success: false, error: { message: 'Крайната дата трябва да е след началната', code: ErrorCodes.VALIDATION_ERROR, details: [{ field: 'unavailable_until', message: 'Крайната дата трябва да е след началната' }] } });
    if (unavailable_reason && unavailable_reason.length > 255)
      return res.status(400).json({ success: false, error: { message: 'Причината не може да надвишава 255 символа', code: ErrorCodes.VALIDATION_ERROR } });
  }

  const [rows] = await pool.query('SELECT id FROM cars WHERE id = ?', [carId]);
  if (!rows.length)
    return res.status(404).json({ success: false, error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND } });

  await pool.query(
    `UPDATE cars
     SET unavailable_from   = ?,
         unavailable_until  = ?,
         unavailable_reason = ?
     WHERE id = ?`,
    [
      clearing ? null : unavailable_from,
      clearing ? null : unavailable_until,
      clearing ? null : (unavailable_reason || null),
      carId,
    ]
  );

  res.json({
    success: true,
    message: clearing
      ? 'Прозорецът за недостъпност е премахнат'
      : 'Прозорецът за недостъпност е запазен успешно',
  });
}));

// ─── POST /api/cars  (admin) ──────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { brand, model, year, license_plate, price_per_day, type, seats,
    transmission, fuel_type, mileage, image_url, description, available, status } = req.body;

  const errors = validateCarInput(req.body, false);
  if (errors.length)
    return res.status(400).json({ success: false, error: { message: 'Моля, поправете грешките', code: ErrorCodes.VALIDATION_ERROR, details: errors } });

  const [result] = await pool.query(
    `INSERT INTO cars (brand, model, year, license_plate, price_per_day, type, seats,
                       transmission, fuel_type, mileage, image_url, description, available, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [brand, model, year, license_plate || null, price_per_day,
      type || 'sedan', seats || 5, transmission || 'automatic', fuel_type || 'petrol',
      mileage || 0, image_url || null, description || null, available !== false, status || 'available']
  );
  res.status(201).json({ success: true, message: 'Автомобилът е създаден успешно', id: result.insertId });
}));

// ─── PUT /api/cars/:id  (admin) ───────────────────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });

  const { brand, model, year, license_plate, price_per_day, type, seats,
    transmission, fuel_type, mileage, image_url, description, available, status } = req.body;

  const errors = validateCarInput(req.body, true);
  if (errors.length)
    return res.status(400).json({ success: false, error: { message: 'Моля, поправете грешките', code: ErrorCodes.VALIDATION_ERROR, details: errors } });

  const [result] = await pool.query(
    `UPDATE cars SET brand=?, model=?, year=?, license_plate=?, price_per_day=?,
                     type=?, seats=?, transmission=?, fuel_type=?, mileage=?,
                     image_url=?, description=?, available=?, status=? WHERE id=?`,
    [brand, model, year, license_plate, price_per_day, type, seats,
      transmission, fuel_type, mileage, image_url, description, available, status || 'available', carId]
  );

  if (!result.affectedRows)
    return res.status(404).json({ success: false, error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND } });

  res.json({ success: true, message: 'Автомобилът е обновен успешно' });
}));

// ─── DELETE /api/cars/:id  (admin) ────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  if (isNaN(carId))
    return res.status(400).json({ success: false, error: { message: 'Невалидно ID', code: ErrorCodes.INVALID_VALUE } });

  const [result] = await pool.query('DELETE FROM cars WHERE id = ?', [carId]);
  if (!result.affectedRows)
    return res.status(404).json({ success: false, error: { message: 'Автомобилът не е намерен', code: ErrorCodes.NOT_FOUND } });

  res.json({ success: true, message: 'Автомобилът е изтрит успешно' });
}));

module.exports = router;
