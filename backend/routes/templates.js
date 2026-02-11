const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Всички шаблони (публичен)
router.get('/', async (req, res) => {
  try {
    const [templates] = await pool.query(
      'SELECT * FROM templates WHERE is_active = TRUE ORDER BY duration_days'
    );
    
    // Вземане на опциите за всеки шаблон
    for (const template of templates) {
      const [options] = await pool.query(
        'SELECT * FROM template_options WHERE template_id = ?',
        [template.id]
      );
      template.options = options;
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Грешка при извличане на шаблони' });
  }
});

// Един шаблон (публичен)
router.get('/:id', async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM templates WHERE id = ?', [req.params.id]);
    
    if (templates.length === 0) {
      return res.status(404).json({ error: 'Шаблонът не е намерен' });
    }

    const template = templates[0];
    const [options] = await pool.query(
      'SELECT * FROM template_options WHERE template_id = ?',
      [template.id]
    );
    template.options = options;

    // Коментари за този шаблон
    const [comments] = await pool.query(
      `SELECT pc.*, u.first_name, u.last_name 
       FROM template_comments pc 
       LEFT JOIN users u ON pc.user_id = u.id 
       WHERE pc.template_id = ? AND pc.status = 'approved'
       ORDER BY pc.created_at DESC`,
      [template.id]
    );
    template.comments = comments;

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Грешка при извличане на шаблон' });
  }
});

// Създаване на шаблон (админ)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, duration_days, discount_percent, is_active, options } = req.body;

    if (!name || !duration_days) {
      return res.status(400).json({ error: 'Име и продължителност са задължителни' });
    }

    const [result] = await pool.query(
      'INSERT INTO templates (name, description, duration_days, discount_percent, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, duration_days, discount_percent || 0, is_active !== false]
    );

    // Ако има опции, ги добавяме
    if (options && Array.isArray(options)) {
      for (const option of options) {
        await pool.query(
          'INSERT INTO template_options (template_id, name, price, is_included) VALUES (?, ?, ?, ?)',
          [result.insertId, option.name, option.price || 0, option.is_included || false]
        );
      }
    }

    res.status(201).json({ 
      message: 'Шаблонът е създаден успешно',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Грешка при създаване на шаблон' });
  }
});

// Редактиране на шаблон (админ)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, duration_days, discount_percent, is_active } = req.body;

    const [result] = await pool.query(
      'UPDATE templates SET name=?, description=?, duration_days=?, discount_percent=?, is_active=? WHERE id=?',
      [name, description, duration_days, discount_percent, is_active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Шаблонът не е намерен' });
    }

    res.json({ message: 'Шаблонът е обновен успешно' });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Грешка при обновяване на шаблон' });
  }
});

// Изтриване на шаблон (админ)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM templates WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Шаблонът не е намерен' });
    }

    res.json({ message: 'Шаблонът е изтрит успешно' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Грешка при изтриване на шаблон' });
  }
});

module.exports = router;

