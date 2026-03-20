const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Helper to validate request input
const validateRequestInput = (data) => {
  const errors = [];
  
  // Car IDs validation
  if (!data.car_ids || !Array.isArray(data.car_ids) || data.car_ids.length === 0) {
    errors.push({ field: 'car_ids', message: 'Трябва да изберете поне един автомобил' });
  }
  
  // Date validation
  if (!data.start_date) {
    errors.push({ field: 'start_date', message: 'Началната дата е задължителна' });
  }
  if (!data.end_date) {
    errors.push({ field: 'end_date', message: 'Крайната дата е задължителна' });
  }
  
  // Date format and range validation
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(start.getTime())) {
      errors.push({ field: 'start_date', message: 'Невалидна начална дата' });
    }
    if (isNaN(end.getTime())) {
      errors.push({ field: 'end_date', message: 'Невалидна крайна дата' });
    }
    if (!isNaN(start.getTime()) && start < today) {
      errors.push({ field: 'start_date', message: 'Началната дата не може да бъде в миналото' });
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
      errors.push({ field: 'end_date', message: 'Крайната дата трябва да е след началната' });
    }
  }
  
  // Notes length validation
  if (data.notes && data.notes.length > 1000) {
    errors.push({ field: 'notes', message: 'Б не може да надележкатавишава 1000 символа' });
  }
  
  return errors;
};

// Valid statuses
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

// Създаване на заявка за наем
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { template_id, car_ids, start_date, end_date, notes, contact_person_id, is_draft } = req.body;

  // Validate input (skip for drafts)
  if (!is_draft) {
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
  }

  // For drafts, we just save minimal data
  if (is_draft) {
    const [result] = await pool.query(
      'INSERT INTO rental_requests (user_id, template_id, start_date, end_date, total_price, notes, contact_person_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, template_id || null, start_date || null, end_date || null, 0, notes || null, contact_person_id || null, 'draft']
    );

    // Add cars to request if provided
    if (car_ids && Array.isArray(car_ids) && car_ids.length > 0) {
      for (const car_id of car_ids) {
        await pool.query(
          'INSERT INTO request_cars (request_id, car_id) VALUES (?, ?)',
          [result.insertId, car_id]
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Черновата е запазена успешно',
      id: result.insertId
    });
  }

  // Parse dates
  const start = new Date(start_date);
  const end = new Date(end_date);

  // Get cars and verify availability
  const [cars] = await pool.query(
    'SELECT * FROM cars WHERE id IN (?) AND available = TRUE',
    [car_ids]
  );

  if (cars.length !== car_ids.length) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Някои от избраните автомобили не са налични',
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'car_ids', message: 'Някои от избраните автомобили не са налични' }]
      }
    });
  }

  // Calculate price
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  let basePrice = 0;

  for (const car of cars) {
    basePrice += car.price_per_day;
  }

  // Apply template discount
  let discount = 0;
  if (template_id) {
    const [templates] = await pool.query('SELECT * FROM templates WHERE id = ?', [template_id]);
    if (templates.length > 0) {
      discount = templates[0].discount_percent || 0;
    }
  }

  const totalPrice = basePrice * days * (1 - discount / 100);

  // Create request
  const [result] = await pool.query(
    'INSERT INTO rental_requests (user_id, template_id, contact_person_id, start_date, end_date, total_price, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, template_id || null, contact_person_id || null, start_date, end_date, totalPrice.toFixed(2), notes || null, 'pending']
  );

  // Add cars to request
  for (const car_id of car_ids) {
    await pool.query(
      'INSERT INTO request_cars (request_id, car_id) VALUES (?, ?)',
      [result.insertId, car_id]
    );
  }

  // Create notification for contact person if set
  if (contact_person_id) {
    const [contactUser] = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [contact_person_id]
    );
    if (contactUser.length > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
        [contact_person_id, 'request_assigned', 'Нова заявка като контактно лице',
         `Бяхте добавен като контактно лице към заявка от ${req.user.first_name || req.user.email}`, result.insertId]
      );
    }
  }

  res.status(201).json({
    success: true,
    message: 'Заявката е създадена успешно',
    id: result.insertId,
    total_price: totalPrice.toFixed(2)
  });
}));

// Моите заявки (клиент)
router.get('/my', requireAuth, asyncHandler(async (req, res) => {
  const { include_drafts } = req.query;

  let query = `
    SELECT rr.*, t.name as template_name,
           cp.first_name as contact_first_name, cp.last_name as contact_last_name, cp.email as contact_email, cp.phone as contact_phone
    FROM rental_requests rr
    LEFT JOIN templates t ON rr.template_id = t.id
    LEFT JOIN users cp ON rr.contact_person_id = cp.id
    WHERE rr.user_id = ?
  `;

  if (include_drafts !== 'true') {
    query += ` AND rr.status != 'draft'`;
  }

  query += ` ORDER BY rr.created_at DESC`;

  const [requests] = await pool.query(query, [req.user.id]);

  // Add cars to each request
  for (const request of requests) {
    const [cars] = await pool.query(
      `SELECT c.* FROM cars c
       JOIN request_cars rc ON c.id = rc.car_id
       WHERE rc.request_id = ?`,
      [request.id]
    );
    request.cars = cars;
  }

  res.json({
    success: true,
    data: requests,
    count: requests.length
  });
}));

// Чернови на заявки (клиент)
router.get('/drafts', requireAuth, asyncHandler(async (req, res) => {
  const [drafts] = await pool.query(
    `SELECT rr.*, t.name as template_name
     FROM rental_requests rr
     LEFT JOIN templates t ON rr.template_id = t.id
     WHERE rr.user_id = ? AND rr.status = 'draft'
     ORDER BY rr.updated_at DESC`,
    [req.user.id]
  );

  // Add cars to each draft
  for (const draft of drafts) {
    const [cars] = await pool.query(
      `SELECT c.* FROM cars c
       JOIN request_cars rc ON c.id = rc.car_id
       WHERE rc.request_id = ?`,
      [draft.id]
    );
    draft.cars = cars;
  }

  res.json({
    success: true,
    data: drafts,
    count: drafts.length
  });
}));

// Актуализиране на чернова
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);

  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на заявка',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  // Check if request exists and belongs to user and is draft
  const [requests] = await pool.query(
    'SELECT * FROM rental_requests WHERE id = ? AND user_id = ? AND status = ?',
    [requestId, req.user.id, 'draft']
  );

  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Черновата не е намерена или вече е изпратена',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  const { template_id, car_ids, start_date, end_date, notes, contact_person_id, submit } = req.body;

  // If submitting, validate all required fields
  if (submit) {
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
  }

  // Update the draft
  let totalPrice = 0;
  if (submit && start_date && end_date && car_ids) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Get car prices
    const [cars] = await pool.query('SELECT price_per_day FROM cars WHERE id IN (?)', [car_ids]);
    let basePrice = cars.reduce((sum, c) => sum + parseFloat(c.price_per_day), 0);

    // Apply template discount
    let discount = 0;
    if (template_id) {
      const [templates] = await pool.query('SELECT discount_percent FROM templates WHERE id = ?', [template_id]);
      if (templates.length > 0) {
        discount = templates[0].discount_percent || 0;
      }
    }

    totalPrice = basePrice * days * (1 - discount / 100);
  }

  await pool.query(
    `UPDATE rental_requests SET
      template_id = ?, contact_person_id = ?, start_date = ?, end_date = ?,
      notes = ?, total_price = ?, status = ?
     WHERE id = ?`,
    [
      template_id || null,
      contact_person_id || null,
      start_date || null,
      end_date || null,
      notes || null,
      totalPrice.toFixed(2),
      submit ? 'pending' : 'draft',
      requestId
    ]
  );

  // Update cars if provided
  if (car_ids && Array.isArray(car_ids)) {
    await pool.query('DELETE FROM request_cars WHERE request_id = ?', [requestId]);
    for (const car_id of car_ids) {
      await pool.query('INSERT INTO request_cars (request_id, car_id) VALUES (?, ?)', [requestId, car_id]);
    }
  }

  if (submit && contact_person_id) {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
      [contact_person_id, 'request_assigned', 'Нова заявка като контактно лице',
       `Бяхте добавен като контактно лице към заявка от ${req.user.first_name || req.user.email}`, requestId]
    );
  }

  res.json({
    success: true,
    message: submit ? 'Заявката е изпратена успешно' : 'Черновата е запазена',
    id: requestId,
    total_price: submit ? totalPrice.toFixed(2) : undefined
  });
}));

// Всички заявки (админ)
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  // Validate status if provided
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалиден статус',
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'status', message: 'Невалиден статус' }]
      }
    });
  }
  
  let query = `
    SELECT rr.*, u.first_name, u.last_name, u.email, t.name as template_name 
    FROM rental_requests rr 
    LEFT JOIN users u ON rr.user_id = u.id 
    LEFT JOIN templates t ON rr.template_id = t.id
  `;
  
  const params = [];
  if (status) {
    query += ' WHERE rr.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY rr.created_at DESC';

  const [requests] = await pool.query(query, params);

  // Add cars to each request
  for (const request of requests) {
    const [cars] = await pool.query(
      `SELECT c.* FROM cars c 
       JOIN request_cars rc ON c.id = rc.car_id 
       WHERE rc.request_id = ?`,
      [request.id]
    );
    request.cars = cars;
  }

  res.json({
    success: true,
    data: requests,
    count: requests.length
  });
}));

// Промяна на статус (админ)
router.patch('/:id/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { status } = req.body;

  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на заявка',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  if (!status) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Статусът е задължителен',
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'status', message: 'Статусът е задължителен' }]
      }
    });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалиден статус',
        code: ErrorCodes.INVALID_VALUE,
        details: [{ field: 'status', message: 'Невалиден статус' }]
      }
    });
  }

  const [result] = await pool.query(
    'UPDATE rental_requests SET status = ? WHERE id = ?',
    [status, requestId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Заявката не е намерена',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Статусът е обновен успешно' 
  });
}));

// Детайли за заявка
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  
  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на заявка',
        code: ErrorCodes.INVALID_VALUE
      }
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

  if (req.user.role !== 'admin') {
    query += ' AND rr.user_id = ?';
    params.push(req.user.id);
  }

  const [requests] = await pool.query(query, params);

  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Заявката не е намерена',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  const request = requests[0];

  // Get cars
  const [cars] = await pool.query(
    `SELECT c.* FROM cars c 
     JOIN request_cars rc ON c.id = rc.car_id 
     WHERE rc.request_id = ?`,
    [request.id]
  );
  request.cars = cars;

  res.json({
    success: true,
    data: request
  });
}));

// Отмяна на заявка (клиент)
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.id);
  
  if (isNaN(requestId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на заявка',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  const [requests] = await pool.query(
    'SELECT * FROM rental_requests WHERE id = ? AND user_id = ?',
    [requestId, req.user.id]
  );

  if (requests.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Заявката не е намерена',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  const request = requests[0];
  if (request.status !== 'pending') {
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

  res.json({ 
    success: true,
    message: 'Заявката е отменена' 
  });
}));

module.exports = router;

