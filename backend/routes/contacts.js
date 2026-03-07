const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to validate contact input
const validateContactInput = (data) => {
  const errors = [];
  
  // Name validation
  if (!data.name) {
    errors.push({ field: 'name', message: 'Името е задължително' });
  } else if (data.name.length < 2) {
    errors.push({ field: 'name', message: 'Името трябва да е поне 2 символа' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Името не може да надвишава 100 символа' });
  }
  
  // Email validation
  if (!data.email) {
    errors.push({ field: 'email', message: 'Имейлът е задължителен' });
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.push({ field: 'email', message: 'Моля, въведете валиден имейл адрес' });
  }
  
  // Message validation
  if (!data.message) {
    errors.push({ field: 'message', message: 'Съобщението е задължително' });
  } else if (data.message.length < 3) {
    errors.push({ field: 'message', message: 'Съобщението трябва да е поне 3 символа' });
  } else if (data.message.length > 5000) {
    errors.push({ field: 'message', message: 'Съобщението не може да надвишава 5000 символа' });
  }
  
  // Subject length (optional)
  if (data.subject && data.subject.length > 200) {
    errors.push({ field: 'subject', message: 'Заглавието не може да надвишава 200 символа' });
  }
  
  return errors;
};

// Изпращане на контактно съобщение (публичен)
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate input
  const validationErrors = validateContactInput(req.body);
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

  await pool.query(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
    [name.trim(), email.toLowerCase().trim(), subject?.trim() || null, message.trim()]
  );

  res.status(201).json({ 
    success: true,
    message: 'Съобщението е изпратено успешно' 
  });
}));

// Всички съобщения (админ)
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { read } = req.query;
  let query = 'SELECT * FROM contact_messages';
  const params = [];

  if (read === 'true') {
    query += ' WHERE is_read = TRUE';
  } else if (read === 'false') {
    query += ' WHERE is_read = FALSE';
  }

  query += ' ORDER BY created_at DESC';

  const [messages] = await pool.query(query, params);
  
  res.json({
    success: true,
    data: messages,
    count: messages.length
  });
}));

// Маркиране като прочетено (админ)
router.patch('/:id/read', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const messageId = parseInt(req.params.id);
  
  if (isNaN(messageId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на съобщение',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  const [result] = await pool.query(
    'UPDATE contact_messages SET is_read = TRUE WHERE id = ?',
    [messageId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Съобщението не е намерено',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Съобщението е маркирано като прочетено' 
  });
}));

// Изтриване на съобщение (админ)
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const messageId = parseInt(req.params.id);
  
  if (isNaN(messageId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на съобщение',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  const [result] = await pool.query('DELETE FROM contact_messages WHERE id = ?', [messageId]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Съобщението не е намерено',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Съобщението е изтрито' 
  });
}));

module.exports = router;

