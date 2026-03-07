const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Helper to validate template input
const validateTemplateInput = (data, isUpdate = false) => {
  const errors = [];
  
  // Required fields
  if (!isUpdate) {
    if (!data.name) {
      errors.push({ field: 'name', message: 'Името е задължително' });
    }
    if (!data.duration_days) {
      errors.push({ field: 'duration_days', message: 'Продължителността е задължителна' });
    }
  }
  
  // Name validation
  if (data.name) {
    if (data.name.length < 2) {
      errors.push({ field: 'name', message: 'Името трябва да е поне 2 символа' });
    }
    if (data.name.length > 100) {
      errors.push({ field: 'name', message: 'Името не може да надвишава 100 символа' });
    }
  }
  
  // Duration validation
  if (data.duration_days) {
    const duration = parseInt(data.duration_days);
    if (isNaN(duration) || duration < 1) {
      errors.push({ field: 'duration_days', message: 'Продължителността трябва да е положително число' });
    }
  }
  
  // Discount validation
  if (data.discount_percent !== undefined) {
    const discount = parseFloat(data.discount_percent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      errors.push({ field: 'discount_percent', message: 'Отстъпката трябва да е между 0 и 100' });
    }
  }
  
  // Description length
  if (data.description && data.description.length > 1000) {
    errors.push({ field: 'description', message: 'Описанието не може да надвишава 1000 символа' });
  }
  
  return errors;
};

// Всички шаблони (публичен)
router.get('/', asyncHandler(async (req, res) => {
  const [templates] = await pool.query(
    'SELECT * FROM templates WHERE is_active = TRUE ORDER BY duration_days'
  );
  
  // Get options for each template
  for (const template of templates) {
    const [options] = await pool.query(
      'SELECT * FROM template_options WHERE template_id = ?',
      [template.id]
    );
    template.options = options;
  }
  
  res.json({
    success: true,
    data: templates,
    count: templates.length
  });
}));

// Един шаблон (публичен)
router.get('/:id', asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.id);
  
  if (isNaN(templateId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на шаблон',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }
  
  const [templates] = await pool.query('SELECT * FROM templates WHERE id = ?', [templateId]);
  
  if (templates.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Шаблонът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  const template = templates[0];
  const [options] = await pool.query(
    'SELECT * FROM template_options WHERE template_id = ?',
    [template.id]
  );
  template.options = options;

  // Comments for this template
  const [comments] = await pool.query(
    `SELECT pc.*, u.first_name, u.last_name 
     FROM template_comments pc 
     LEFT JOIN users u ON pc.user_id = u.id 
     WHERE pc.template_id = ? AND pc.status = 'approved'
     ORDER BY pc.created_at DESC`,
    [template.id]
  );
  template.comments = comments;

  res.json({
    success: true,
    data: template
  });
}));

// Създаване на шаблон (админ)
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, duration_days, discount_percent, is_active, options } = req.body;

  // Validate input
  const validationErrors = validateTemplateInput(req.body, false);
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
    'INSERT INTO templates (name, description, duration_days, discount_percent, is_active) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, duration_days, discount_percent || 0, is_active !== false]
  );

  // Add options if provided
  if (options && Array.isArray(options)) {
    for (const option of options) {
      await pool.query(
        'INSERT INTO template_options (template_id, name, price, is_included) VALUES (?, ?, ?, ?)',
        [result.insertId, option.name, option.price || 0, option.is_included || false]
      );
    }
  }

  res.status(201).json({ 
    success: true,
    message: 'Шаблонът е създаден успешно',
    id: result.insertId 
  });
}));

// Редактиране на шаблон (админ)
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.id);
  
  if (isNaN(templateId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на шаблон',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }
  
  const { name, description, duration_days, discount_percent, is_active } = req.body;

  // Validate input
  const validationErrors = validateTemplateInput(req.body, true);
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
    'UPDATE templates SET name=?, description=?, duration_days=?, discount_percent=?, is_active=? WHERE id=?',
    [name, description, duration_days, discount_percent, is_active, templateId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Шаблонът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Шаблонът е обновен успешно' 
  });
}));

// Изтриване на шаблон (админ)
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.id);
  
  if (isNaN(templateId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на шаблон',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  const [result] = await pool.query('DELETE FROM templates WHERE id = ?', [templateId]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Шаблонът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Шаблонът е изтрит успешно' 
  });
}));

module.exports = router;

