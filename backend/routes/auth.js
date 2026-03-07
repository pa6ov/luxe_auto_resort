const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { 
  ValidationError, 
  AuthError, 
  NotFoundError,
  asyncHandler,
  validate,
  ErrorCodes
} = require('../utils/errors');

const router = express.Router();

// Email format validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;

// Helper to validate registration input
const validateRegistrationInput = (data) => {
  const errors = [];
  
  // Email validation
  if (!data.email) {
    errors.push({ field: 'email', message: 'Имейлът е задължителен' });
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.push({ field: 'email', message: 'Моля, въведете валиден имейл адрес' });
  }
  
  // Password validation
  if (!data.password) {
    errors.push({ field: 'password', message: 'Паролата е задължителна' });
  } else if (data.password.length < PASSWORD_MIN_LENGTH) {
    errors.push({ field: 'password', message: `Паролата трябва да е поне ${PASSWORD_MIN_LENGTH} символа` });
  } else if (!/[a-zA-Z]/.test(data.password)) {
    errors.push({ field: 'password', message: 'Паролата трябва да съдържа поне една буква' });
  } else if (!/[0-9]/.test(data.password)) {
    errors.push({ field: 'password', message: 'Паролата трябва да съдържа поне една цифра' });
  }
  
  // First name validation
  if (!data.first_name) {
    errors.push({ field: 'first_name', message: 'Името е задължително' });
  } else if (data.first_name.length < 2) {
    errors.push({ field: 'first_name', message: 'Името трябва да е поне 2 символа' });
  } else if (data.first_name.length > 50) {
    errors.push({ field: 'first_name', message: 'Името не може да надвишава 50 символа' });
  }
  
  // Last name validation
  if (!data.last_name) {
    errors.push({ field: 'last_name', message: 'Фамилията е задължителна' });
  } else if (data.last_name.length < 2) {
    errors.push({ field: 'last_name', message: 'Фамилията трябва да е поне 2 символа' });
  } else if (data.last_name.length > 50) {
    errors.push({ field: 'last_name', message: 'Фамилията не може да надвишава 50 символа' });
  }
  
  // Phone validation (optional but if provided, validate format)
  if (data.phone && !/^[0-9+\s\-()]{7,20}$/.test(data.phone)) {
    errors.push({ field: 'phone', message: 'Невалиден формат на телефонния номер' });
  }
  
  return errors;
};

// Helper to validate login input
const validateLoginInput = (data) => {
  const errors = [];
  
  if (!data.email) {
    errors.push({ field: 'email', message: 'Имейлът е задължителен' });
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.push({ field: 'email', message: 'Моля, въведете валиден имейл адрес' });
  }
  
  if (!data.password) {
    errors.push({ field: 'password', message: 'Паролата е задължителна' });
  }
  
  return errors;
};

// Регистрация (само за клиенти)
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  // Validate input
  const validationErrors = validateRegistrationInput(req.body);
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

  // Check if email already exists
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing.length > 0) {
    return res.status(409).json({
      success: false,
      error: {
        message: 'Този имейл вече е регистриран',
        code: ErrorCodes.EMAIL_ALREADY_EXISTS,
        details: [{ field: 'email', message: 'Този имейл вече е регистриран' }]
      }
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  await pool.query(
    'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    [email.toLowerCase().trim(), hashedPassword, first_name.trim(), last_name.trim(), phone?.trim() || null, 'client']
  );

  res.status(201).json({
    success: true,
    message: 'Успешна регистрация'
  });
}));

// Вход
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  const validationErrors = validateLoginInput(req.body);
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

  // Find user by email (case-insensitive)
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  
  // Use same error message for both wrong email and wrong password (security)
  if (users.length === 0) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Невалиден имейл или парола',
        code: ErrorCodes.INVALID_CREDENTIALS
      }
    });
  }

  const user = users[0];

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Невалиден имейл или парола',
        code: ErrorCodes.INVALID_CREDENTIALS
      }
    });
  }

  // Create JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    }
  });
}));

// Текущ потребител
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [users] = await pool.query(
    'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Потребителят не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({
    success: true,
    data: users[0]
  });
}));

// Изход (за клиентска страна - само за информация, токенът се изтрива от клиента)
router.post('/logout', (req, res) => {
  res.json({ 
    success: true,
    message: 'Успешен изход' 
  });
});

module.exports = router;

