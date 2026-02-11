const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Регистрация (само за клиенти)
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Валидация
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Имейл, парола, име и фамилия са задължителни' });
    }

    // Проверка дали имейлът вече съществува
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Този имейл вече е регистриран' });
    }

    // Хеширане на паролата
    const hashedPassword = await bcrypt.hash(password, 10);

    // Създаване на потребител
    await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, first_name, last_name, phone || null, 'client']
    );

    res.status(201).json({ message: 'Успешна регистрация' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Грешка при регистрация' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Имейл и парола са задължителни' });
    }

    // Намиране на потребител
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Невалиден имейл или парола' });
    }

    const user = users[0];

    // Проверка на паролата
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Невалиден имейл или парола' });
    }

    // Създаване на JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Грешка при вход' });
  }
});

// Текущ потребител
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Потребител не е намерен' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Грешка при извличане на потребител' });
  }
});

// Изход (за клиентска страна - само за информация, токенът се изтрива от клиента)
router.post('/logout', (req, res) => {
  res.json({ message: 'Успешен изход' });
});

module.exports = router;

