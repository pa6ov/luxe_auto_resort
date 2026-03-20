const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ErrorCodes } = require('../utils/errors');

const router = express.Router();

// Helper to validate comment input
const validateCommentInput = (data) => {
  const errors = [];
  
  // Content validation
  if (!data.content) {
    errors.push({ field: 'content', message: 'Съдържанието на коментара е задължително' });
  } else if (data.content.length < 3) {
    errors.push({ field: 'content', message: 'Коментарът трябва да е поне 3 символа' });
  } else if (data.content.length > 2000) {
    errors.push({ field: 'content', message: 'Коментарът не може да надвишава 2000 символа' });
  }
  
  // Rating validation
  if (data.rating !== undefined && data.rating !== null) {
    const rating = parseInt(data.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      errors.push({ field: 'rating', message: 'Рейтингът трябва да е между 1 и 5' });
    }
  }
  
  return errors;
};

// Всички одобрени коментари (публичен)
router.get('/platform', asyncHandler(async (req, res) => {
  const [comments] = await pool.query(
    `SELECT pc.*, u.first_name, u.last_name 
     FROM platform_comments pc 
     LEFT JOIN users u ON pc.user_id = u.id 
     WHERE pc.status = 'approved'
     ORDER BY pc.created_at DESC`
  );
  
  res.json({
    success: true,
    data: comments,
    count: comments.length
  });
}));

// Добавяне на коментар за платформата
router.post('/platform', requireAuth, asyncHandler(async (req, res) => {
  const { content, rating } = req.body;

  // Validate input
  const validationErrors = validateCommentInput(req.body);
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
    'INSERT INTO platform_comments (user_id, content, rating) VALUES (?, ?, ?)',
    [req.user.id, content, rating || null]
  );

  res.status(201).json({ 
    success: true,
    message: 'Коментарът е изпратен за одобрение' 
  });
}));

// Всички одобрени коментари за шаблон (публичен)
router.get('/templates/:templateId', asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.templateId);
  
  if (isNaN(templateId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на шаблон',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }
  
  const [comments] = await pool.query(
    `SELECT pc.*, u.first_name, u.last_name 
     FROM template_comments pc 
     LEFT JOIN users u ON pc.user_id = u.id 
     WHERE pc.template_id = ? AND pc.status = 'approved'
     ORDER BY pc.created_at DESC`,
    [templateId]
  );
  
  res.json({
    success: true,
    data: comments,
    count: comments.length
  });
}));

// Добавяне на коментар за шаблон
router.post('/templates/:templateId', requireAuth, asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.templateId);
  const { content, rating } = req.body;

  if (isNaN(templateId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на шаблон',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  // Validate input
  const validationErrors = validateCommentInput(req.body);
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

  // Check if template exists
  const [templates] = await pool.query('SELECT id FROM templates WHERE id = ?', [templateId]);
  if (templates.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Шаблонът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  await pool.query(
    'INSERT INTO template_comments (user_id, template_id, content, rating) VALUES (?, ?, ?, ?)',
    [req.user.id, templateId, content, rating || null]
  );

  res.status(201).json({ 
    success: true,
    message: 'Коментарът е изпратен за одобрение' 
  });
}));

// Редактиране на собствен коментар (клиент)
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const commentId = parseInt(req.params.id);
  const { content, rating, type } = req.body; // type: 'platform' | 'template'

  if (isNaN(commentId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на коментар', code: ErrorCodes.INVALID_VALUE }
    });
  }

  if (!type || !['platform', 'template'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Типът на коментара е задължителен (platform или template)',
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'type', message: 'Типът е задължителен' }]
      }
    });
  }

  // Validate content
  const validationErrors = validateCommentInput({ content, rating });
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Моля, поправете грешките',
        code: ErrorCodes.VALIDATION_ERROR,
        details: validationErrors
      }
    });
  }

  const table = type === 'template' ? 'template_comments' : 'platform_comments';

  // Verify ownership — user can only edit their own comment
  const [rows] = await pool.query(
    `SELECT id, user_id FROM ${table} WHERE id = ?`,
    [commentId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: 'Коментарът не е намерен', code: ErrorCodes.NOT_FOUND }
    });
  }

  // Admins can edit any comment; clients only their own
  if (req.user.role !== 'admin' && rows[0].user_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: { message: 'Нямате права да редактирате този коментар', code: ErrorCodes.FORBIDDEN }
    });
  }

  // After edit, reset to pending so admin re-approves (unless admin is editing)
  const newStatus = req.user.role === 'admin' ? 'approved' : 'pending';

  await pool.query(
    `UPDATE ${table} SET content = ?, rating = ?, status = ? WHERE id = ?`,
    [content.trim(), rating || null, newStatus, commentId]
  );

  res.json({
    success: true,
    message: req.user.role === 'admin'
      ? 'Коментарът е обновен'
      : 'Коментарът е обновен и изпратен за повторно одобрение'
  });
}));

// Изтриване на собствен коментар от клиента (различно от admin delete)
router.delete('/:id/own', requireAuth, asyncHandler(async (req, res) => {
  const commentId = parseInt(req.params.id);

  if (isNaN(commentId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Невалидно ID на коментар', code: ErrorCodes.INVALID_VALUE }
    });
  }

  // Try platform_comments first
  const [pRows] = await pool.query(
    'SELECT id, user_id FROM platform_comments WHERE id = ?',
    [commentId]
  );

  if (pRows.length > 0) {
    if (pRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Нямате права да изтриете този коментар', code: ErrorCodes.FORBIDDEN }
      });
    }
    await pool.query('DELETE FROM platform_comments WHERE id = ?', [commentId]);
    return res.json({ success: true, message: 'Коментарът е изтрит' });
  }

  // Try template_comments
  const [tRows] = await pool.query(
    'SELECT id, user_id FROM template_comments WHERE id = ?',
    [commentId]
  );

  if (tRows.length > 0) {
    if (tRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Нямате права да изтриете този коментар', code: ErrorCodes.FORBIDDEN }
      });
    }
    await pool.query('DELETE FROM template_comments WHERE id = ?', [commentId]);
    return res.json({ success: true, message: 'Коментарът е изтрит' });
  }

  return res.status(404).json({
    success: false,
    error: { message: 'Коментарът не е намерен', code: ErrorCodes.NOT_FOUND }
  });
}));


// Admin: Всички чакащи коментари
router.get('/pending', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const [platformComments] = await pool.query(
    `SELECT 'platform' as type, pc.*, u.first_name, u.last_name 
     FROM platform_comments pc 
     LEFT JOIN users u ON pc.user_id = u.id 
     WHERE pc.status = 'pending'`
  );

  const [templateComments] = await pool.query(
    `SELECT 'template' as type, tc.*, u.first_name, u.last_name, t.name as template_name
     FROM template_comments tc 
     LEFT JOIN users u ON tc.user_id = u.id 
     LEFT JOIN templates t ON tc.template_id = t.id
     WHERE tc.status = 'pending'`
  );

  const allComments = [...platformComments, ...templateComments].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  res.json({
    success: true,
    data: allComments,
    count: allComments.length
  });
}));

// Admin: Одобряване на коментар
router.patch('/:id/approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const commentId = parseInt(req.params.id);
  const { type } = req.body; // 'platform' or 'template'

  if (isNaN(commentId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на коментар',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  if (!type || !['platform', 'template'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Типът на коментара е задължителен (platform или template)',
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'type', message: 'Типът на коментара е задължителен' }]
      }
    });
  }

  const table = type === 'template' ? 'template_comments' : 'platform_comments';
  const [result] = await pool.query(
    `UPDATE ${table} SET status = 'approved' WHERE id = ?`,
    [commentId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Коментарът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Коментарът е одобрен' 
  });
}));

// Admin: Отхвърляне/изтриване на коментар
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const commentId = parseInt(req.params.id);
  const { type } = req.query; // 'platform' or 'template'

  if (isNaN(commentId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидно ID на коментар',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  if (!type || !['platform', 'template'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Типът на коментара е задължителен (platform или template)',
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'type', message: 'Типът на коментара е задължителен' }]
      }
    });
  }

  const table = type === 'template' ? 'template_comments' : 'platform_comments';
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [commentId]);

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Коментарът не е намерен',
        code: ErrorCodes.NOT_FOUND
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Коментарът е отхвърлен' 
  });
}));

module.exports = router;

