const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Всички автомобили (публичен)
router.get('/', async (req, res) => {
  try {
    const { brand, type, min_price, max_price, available, sort } = req.query;
    
    let query = 'SELECT * FROM cars WHERE 1=1';
    const params = [];

    if (brand) {
      query += ' AND brand LIKE ?';
      params.push(`%${brand}%`);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (min_price) {
      query += ' AND price_per_day >= ?';
      params.push(min_price);
    }
    if (max_price) {
      query += ' AND price_per_day <= ?';
      params.push(max_price);
    }
    if (available === 'true') {
      query += ' AND available = TRUE';
    }

    // Сортиране
    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY price_per_day ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY price_per_day DESC';
        break;
      case 'year_desc':
        query += ' ORDER BY year DESC';
        break;
      case 'brand':
        query += ' ORDER BY brand, model';
        break;
      default:
        query += ' ORDER BY id';
    }

    const [cars] = await pool.query(query, params);
    res.json(cars);
  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({ error: 'Грешка при извличане на автомобили' });
  }
});

// Един автомобил (публичен)
router.get('/:id', async (req, res) => {
  try {
    const [cars] = await pool.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    
    if (cars.length === 0) {
      return res.status(404).json({ error: 'Автомобилът не е намерен' });
    }

    res.json(cars[0]);
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({ error: 'Грешка при извличане на автомобил' });
  }
});

// Създаване на автомобил (админ)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { brand, model, year, license_plate, price_per_day, type, seats, 
            transmission, fuel_type, mileage, image_url, description, available } = req.body;

    // Валидация
    if (!brand || !model || !year || !price_per_day) {
      return res.status(400).json({ error: 'Марка, модел, година и цена на ден са задължителни' });
    }

    const [result] = await pool.query(
      `INSERT INTO cars (brand, model, year, license_plate, price_per_day, type, seats, 
                         transmission, fuel_type, mileage, image_url, description, available) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [brand, model, year, license_plate || null, price_per_day, 
       type || 'sedan', seats || 5, transmission || 'automatic', fuel_type || 'petrol',
       mileage || 0, image_url || null, description || null, available !== false]
    );

    res.status(201).json({ 
      message: 'Автомобилът е създаден успешно',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Create car error:', error);
    res.status(500).json({ error: 'Грешка при създаване на автомобил' });
  }
});

// Редактиране на автомобил (админ)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { brand, model, year, license_plate, price_per_day, type, seats, 
            transmission, fuel_type, mileage, image_url, description, available } = req.body;

    const [result] = await pool.query(
      `UPDATE cars SET brand=?, model=?, year=?, license_plate=?, price_per_day=?, 
                         type=?, seats=?, transmission=?, fuel_type=?, mileage=?, image_url=?, 
                         description=?, available=? WHERE id=?`,
      [brand, model, year, license_plate, price_per_day, type, seats,
       transmission, fuel_type, mileage, image_url, description, available, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Автомобилът не е намерен' });
    }

    res.json({ message: 'Автомобилът е обновен успешно' });
  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({ error: 'Грешка при обновяване на автомобил' });
  }
});

// Изтриване на автомобил (админ)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM cars WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Автомобилът не е намерен' });
    }

    res.json({ message: 'Автомобилът е изтрит успешно' });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({ error: 'Грешка при изтриване на автомобил' });
  }
});

module.exports = router;

