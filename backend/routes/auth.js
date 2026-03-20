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

// Актуализация на профил
router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { first_name, last_name, phone, avatar_url } = req.body;

  const updates = [];
  const params = [];

  if (first_name !== undefined) {
    if (first_name.length < 2 || first_name.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Името трябва да е между 2 и 50 символа',
          code: ErrorCodes.VALIDATION_ERROR
        }
      });
    }
    updates.push('first_name = ?');
    params.push(first_name.trim());
  }

  if (last_name !== undefined) {
    if (last_name.length < 2 || last_name.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Фамилията трябва да е между 2 и 50 символа',
          code: ErrorCodes.VALIDATION_ERROR
        }
      });
    }
    updates.push('last_name = ?');
    params.push(last_name.trim());
  }

  if (phone !== undefined) {
    if (phone && !/^[0-9+\s\-()]{7,20}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Невалиден формат на телефонния номер',
          code: ErrorCodes.VALIDATION_ERROR
        }
      });
    }
    updates.push('phone = ?');
    params.push(phone ? phone.trim() : null);
  }

  if (avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    params.push(avatar_url || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Няма данни за актуализация',
        code: ErrorCodes.VALIDATION_ERROR
      }
    });
  }

  params.push(req.user.id);

  await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Return updated user
  const [users] = await pool.query(
    'SELECT id, email, first_name, last_name, phone, avatar_url, role FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json({
    success: true,
    message: 'Профилът е актуализиран успешно',
    data: users[0]
  });
}));

// Смяна на парола
router.put('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Текущата и новата парола са задължителни',
        code: ErrorCodes.VALIDATION_ERROR
      }
    });
  }

  if (new_password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({
      success: false,
      error: {
        message: `Новата парола трябва да е поне ${PASSWORD_MIN_LENGTH} символа`,
        code: ErrorCodes.VALIDATION_ERROR
      }
    });
  }

  if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Новата парола трябва да съдържа поне една буква и една цифра',
        code: ErrorCodes.VALIDATION_ERROR
      }
    });
  }

  // Verify current password
  const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Потребителят не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  const validPassword = await bcrypt.compare(current_password, users[0].password);
  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Невалидна текуща парола',
        code: ErrorCodes.INVALID_CREDENTIALS
      }
    });
  }

  // Hash and save new password
  const hashedPassword = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

  res.json({
    success: true,
    message: 'Паролата е променена успешно'
  });
}));

// Търсене на потребители (за връзка с контакт)
router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Моля, въведете поне 2 символа за търсене',
        code: ErrorCodes.VALIDATION_ERROR
      }
    });
  }

  const [users] = await pool.query(
    `SELECT id, email, first_name, last_name, phone FROM users
     WHERE (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)
     AND id != ?
     LIMIT 10`,
    [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, req.user.id]
  );

  res.json({
    success: true,
    data: users,
    count: users.length
  });
}));

module.exports = router;

