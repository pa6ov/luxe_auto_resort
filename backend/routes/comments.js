const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Коментари за платформата

// Всички одобрени коментари (публичен)
router.get('/platform', async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT pc.*, u.first_name, u.last_name 
       FROM platform_comments pc 
       LEFT JOIN users u ON pc.user_id = u.id 
       WHERE pc.status = 'approved'
       ORDER BY pc.created_at DESC`
    );
    res.json(comments);
  } catch (error) {
    console.error('Get platform comments error:', error);
    res.status(500).json({ error: 'Грешка при извличане на коментари' });
  }
});

// Добавяне на коментар за платформата
router.post('/platform', requireAuth, async (req, res) => {
  try {
    const { content, rating } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Съдържанието на коментара е задължително' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Рейтингът трябва да е между 1 и 5' });
    }

    await pool.query(
      'INSERT INTO platform_comments (user_id, content, rating) VALUES (?, ?, ?)',
      [req.user.id, content, rating || null]
    );

    res.status(201).json({ message: 'Коментарът е изпратен за одобрение' });
  } catch (error) {
    console.error('Add platform comment error:', error);
    res.status(500).json({ error: 'Грешка при добавяне на коментар' });
  }
});

// Коментари за шаблон

// Всички одобрени коментари за шаблон (публичен)
router.get('/templates/:templateId', async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT pc.*, u.first_name, u.last_name 
       FROM template_comments pc 
       LEFT JOIN users u ON pc.user_id = u.id 
       WHERE pc.template_id = ? AND pc.status = 'approved'
       ORDER BY pc.created_at DESC`,
      [req.params.templateId]
    );
    res.json(comments);
  } catch (error) {
    console.error('Get template comments error:', error);
    res.status(500).json({ error: 'Грешка при извличане на коментари' });
  }
});

// Добавяне на коментар за шаблон
router.post('/templates/:templateId', requireAuth, async (req, res) => {
  try {
    const { content, rating } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Съдържанието на коментара е задължително' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Рейтингът трябва да е между 1 и 5' });
    }

    // Проверка дали шаблонът съществува
    const [templates] = await pool.query('SELECT id FROM templates WHERE id = ?', [req.params.templateId]);
    if (templates.length === 0) {
      return res.status(404).json({ error: 'Шаблонът не е намерен' });
    }

    await pool.query(
      'INSERT INTO template_comments (user_id, template_id, content, rating) VALUES (?, ?, ?, ?)',
      [req.user.id, req.params.templateId, content, rating || null]
    );

    res.status(201).json({ message: 'Коментарът е изпратен за одобрение' });
  } catch (error) {
    console.error('Add template comment error:', error);
    res.status(500).json({ error: 'Грешка при добавяне на коментар' });
  }
});

// Admin: Всички чакащи коментари
router.get('/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
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

    res.json(allComments);
  } catch (error) {
    console.error('Get pending comments error:', error);
    res.status(500).json({ error: 'Грешка при извличане на коментари' });
  }
});

// Admin: Одобряване на коментар
router.patch('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'platform' or 'template'

    const table = type === 'template' ? 'template_comments' : 'platform_comments';
    const [result] = await pool.query(
      `UPDATE ${table} SET status = 'approved' WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Коментарът не е намерен' });
    }

    res.json({ message: 'Коментарът е одобрен' });
  } catch (error) {
    console.error('Approve comment error:', error);
    res.status(500).json({ error: 'Грешка при одобряване' });
  }
});

// Admin: Отхвърляне/изтриване на коментар
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query; // 'platform' or 'template'

    const table = type === 'template' ? 'template_comments' : 'platform_comments';
    const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Коментарът не е намерен' });
    }

    res.json({ message: 'Коментарът е отхвърлен' });
  } catch (error) {
    console.error('Reject comment error:', error);
    res.status(500).json({ error: 'Грешка при изтриване' });
  }
});

module.exports = router;

