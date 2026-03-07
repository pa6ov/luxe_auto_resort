const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Helper to validate car input
const validateCarInput = (data, isUpdate = false) => {
  const errors = [];
  
  // Required fields validation
  if (!isUpdate) {
    if (!data.brand) {
      errors.push({ field: 'brand', message: 'Марката е задължителна' });
    }
    if (!data.model) {
      errors.push({ field: 'model', message: 'Моделът е задължителен' });
    }
    if (!data.year) {
      errors.push({ field: 'year', message: 'Годината е задължителна' });
    }
    if (!data.price_per_day) {
      errors.push({ field: 'price_per_day', message: 'Цената на ден е задължителна' });
    }
  }
  
  // Year validation
  if (data.year) {
    const year = parseInt(data.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      errors.push({ field: 'year', message: 'Невалидна година' });
    }
  }
  
  // Price validation
  if (data.price_per_day) {
    const price = parseFloat(data.price_per_day);
    if (isNaN(price) || price <= 0) {
      errors.push({ field: 'price_per_day', message: 'Цената трябва да е положително число' });
    }
  }
  
  // Seats validation
  if (data.seats) {
    const seats = parseInt(data.seats);
    if (isNaN(seats) || seats < 1 || seats > 50) {
      errors.push({ field: 'seats', message: 'Броят на местата трябва да е между 1 и 50' });
    }
  }
  
  // License plate format validation (optional field)
  if (data.license_plate && !/^[А-ЯA-Z0-9\s\-]{4,15}$/i.test(data.license_plate)) {
    errors.push({ field: 'license_plate', message: 'Невалиден формат на регистрационен номер' });
  }
  
  return errors;
};

// Всички автомобили (публичен)
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
        error: {
          message: 'Невалиден тип автомобил',
          code: ErrorCodes.INVALID_VALUE,
          details: [{ field: 'type', message: 'Невалиден тип автомобил' }]
        }
      });
    }
    query += ' AND type = ?';
    params.push(type);
  }
  if (min_price) {
    const minPrice = parseFloat(min_price);
    if (isNaN(minPrice) || minPrice < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Невалидна минимална цена',
          code: ErrorCodes.INVALID_VALUE
        }
      });
    }
    query += ' AND price_per_day >= ?';
    params.push(min_price);
  }
  if (max_price) {
    const maxPrice = parseFloat(max_price);
    if (isNaN(maxPrice) || maxPrice < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Невалидна максимална цена',
          code: ErrorCodes.INVALID_VALUE
        }
      });
    }
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
  res.json({
    success: true,
    data: cars,
    count: cars.length
  });
}));

// Един автомобил (публичен)
router.get('/:id', asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  
  if (isNaN(carId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на автомобил',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }
  
  const [cars] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
  
  if (cars.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Автомобилът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({
    success: true,
    data: cars[0]
  });
}));

// Създаване на автомобил (админ)
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { brand, model, year, license_plate, price_per_day, type, seats, 
          transmission, fuel_type, mileage, image_url, description, available } = req.body;

  // Validate input
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

  const [result] = await pool.query(
    `INSERT INTO cars (brand, model, year, license_plate, price_per_day, type, seats, 
                       transmission, fuel_type, mileage, image_url, description, available) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [brand, model, year, license_plate || null, price_per_day, 
     type || 'sedan', seats || 5, transmission || 'automatic', fuel_type || 'petrol',
     mileage || 0, image_url || null, description || null, available !== false]
  );

  res.status(201).json({ 
    success: true,
    message: 'Автомобилът е създаден успешно',
    id: result.insertId 
  });
}));

// Редактиране на автомобил (админ)
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  
  if (isNaN(carId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на автомобил',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }
  
  const { brand, model, year, license_plate, price_per_day, type, seats, 
          transmission, fuel_type, mileage, image_url, description, available } = req.body;

  // Validate input
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

  const [result] = await pool.query(
    `UPDATE cars SET brand=?, model=?, year=?, license_plate=?, price_per_day=?, 
                       type=?, seats=?, transmission=?, fuel_type=?, mileage=?, image_url=?, 
                       description=?, available=? WHERE id=?`,
    [brand, model, year, license_plate, price_per_day, type, seats,
     transmission, fuel_type, mileage, image_url, description, available, carId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Автомобилът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Автомобилът е обновен успешно' 
  });
}));

// Изтриване на автомобил (админ)
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const carId = parseInt(req.params.id);
  
  if (isNaN(carId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на автомобил',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }
  
  const [result] = await pool.query('DELETE FROM cars WHERE id = ?', [carId]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Автомобилът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Автомобилът е изтрит успешно' 
  });
}));

module.exports = router;

