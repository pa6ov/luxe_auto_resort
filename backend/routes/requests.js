const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Създаване на заявка за наем
router.post('/', requireAuth, async (req, res) => {
  try {
    const { template_id, car_ids, start_date, end_date, notes } = req.body;

    if (!car_ids || car_ids.length === 0) {
      return res.status(400).json({ error: 'Трябва да изберете поне един автомобил' });
    }
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Начална и крайна дата са задължителни' });
    }

    // Проверка на датите
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (start >= end) {
      return res.status(400).json({ error: 'Крайната дата трябва да е след началната' });
    }

    // Извличане на автомобилите
    const [cars] = await pool.query(
      'SELECT * FROM cars WHERE id IN (?) AND available = TRUE',
      [car_ids]
    );

    if (cars.length !== car_ids.length) {
      return res.status(400).json({ error: 'Някои от избраните автомобили не са налични' });
    }

    // Изчисляване на цената
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let basePrice = 0;

    for (const car of cars) {
      basePrice += car.price_per_day;
    }

    // Прилагане на отстъпка от шаблон
    let discount = 0;
    if (template_id) {
      const [templates] = await pool.query('SELECT * FROM templates WHERE id = ?', [template_id]);
      if (templates.length > 0) {
        discount = templates[0].discount_percent || 0;
      }
    }

    const totalPrice = basePrice * days * (1 - discount / 100);

    // Създаване на заявка
    const [result] = await pool.query(
      'INSERT INTO rental_requests (user_id, template_id, start_date, end_date, total_price, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, template_id || null, start_date, end_date, totalPrice.toFixed(2), notes || null]
    );

    // Добавяне на автомобили към заявката
    for (const car_id of car_ids) {
      await pool.query(
        'INSERT INTO request_cars (request_id, car_id) VALUES (?, ?)',
        [result.insertId, car_id]
      );
    }

    res.status(201).json({ 
      message: 'Заявката е създадена успешно',
      id: result.insertId,
      total_price: totalPrice.toFixed(2)
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Грешка при създаване на заявка' });
  }
});

// Моите заявки (клиент)
router.get('/my', requireAuth, async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT rr.*, t.name as template_name 
       FROM rental_requests rr 
       LEFT JOIN templates t ON rr.template_id = t.id 
       WHERE rr.user_id = ? 
       ORDER BY rr.created_at DESC`,
      [req.user.id]
    );

    // Добавяне на автомобили към всяка заявка
    for (const request of requests) {
      const [cars] = await pool.query(
        `SELECT c.* FROM cars c 
         JOIN request_cars rc ON c.id = rc.car_id 
         WHERE rc.request_id = ?`,
        [request.id]
      );
      request.cars = cars;
    }

    res.json(requests);
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ error: 'Грешка при извличане на заявки' });
  }
});

// Всички заявки (админ)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
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

    // Добавяне на автомобили към всяка заявка
    for (const request of requests) {
      const [cars] = await pool.query(
        `SELECT c.* FROM cars c 
         JOIN request_cars rc ON c.id = rc.car_id 
         WHERE rc.request_id = ?`,
        [request.id]
      );
      request.cars = cars;
    }

    res.json(requests);
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Грешка при извличане на заявки' });
  }
});

// Промяна на статус (админ)
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Невалиден статус' });
    }

    const [result] = await pool.query(
      'UPDATE rental_requests SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Заявката не е намерена' });
    }

    res.json({ message: 'Статусът е обновен успешно' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Грешка при обновяване на статус' });
  }
});

// Детайли за заявка
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Проверка дали потребителят има достъп
    let query = `
      SELECT rr.*, t.name as template_name, u.first_name, u.last_name, u.email 
      FROM rental_requests rr 
      LEFT JOIN templates t ON rr.template_id = t.id
      LEFT JOIN users u ON rr.user_id = u.id
      WHERE rr.id = ?
    `;
    const params = [req.params.id];

    if (req.user.role !== 'admin') {
      query += ' AND rr.user_id = ?';
      params.push(req.user.id);
    }

    const [requests] = await pool.query(query, params);

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Заявката не е намерена' });
    }

    const request = requests[0];

    // Автомобили
    const [cars] = await pool.query(
      `SELECT c.* FROM cars c 
       JOIN request_cars rc ON c.id = rc.car_id 
       WHERE rc.request_id = ?`,
      [request.id]
    );
    request.cars = cars;

    res.json(request);
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Грешка при извличане на заявка' });
  }
});

// Отмяна на заявка (клиент)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const [requests] = await pool.query(
      'SELECT * FROM rental_requests WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Заявката не е намерена' });
    }

    const request = requests[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Може да отмените само чакащи заявки' });
    }

    await pool.query(
      'UPDATE rental_requests SET status = ? WHERE id = ?',
      ['cancelled', req.params.id]
    );

    res.json({ message: 'Заявката е отменена' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Грешка при отмяна на заявка' });
  }
});

module.exports = router;

