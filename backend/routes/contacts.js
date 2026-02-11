const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Изпращане на контактно съобщение (публичен)
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Име, имейл и съобщение са задължителни' });
    }

    await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject || null, message]
    );

    res.status(201).json({ message: 'Съобщението е изпратено успешно' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Грешка при изпращане на съобщение' });
  }
});

// Всички съобщения (админ)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
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
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Грешка при извличане на съобщения' });
  }
});

// Маркиране като прочетено (админ)
router.patch('/:id/read', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE contact_messages SET is_read = TRUE WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Съобщението не е намерено' });
    }

    res.json({ message: 'Съобщението е маркирано като прочетено' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Грешка при обновяване' });
  }
});

// Изтриване на съобщение (админ)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Съобщението не е намерено' });
    }

    res.json({ message: 'Съобщението е изтрито' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Грешка при изтриване' });
  }
});

module.exports = router;

