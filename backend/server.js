const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const templatesRoutes = require('./routes/templates');
const requestsRoutes = require('./routes/requests');
const costsRoutes = require('./routes/costs');
const contactsRoutes = require('./routes/contacts');
const commentsRoutes = require('./routes/comments');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/costs', costsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/comments', commentsRoutes);

// Admin Dashboard
app.get('/api/admin/dashboard', require('./middleware/auth').requireAuth, require('./middleware/auth').requireAdmin, async (req, res) => {
  try {
    // Брой заявки по статус
    const [statusCounts] = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM rental_requests 
      GROUP BY status
    `);

    // Най-наеман автомобил
    const [topCars] = await pool.query(`
      SELECT c.id, c.brand, c.model, c.image_url, COUNT(rc.id) as rental_count
      FROM cars c
      LEFT JOIN request_cars rc ON c.id = rc.car_id
      GROUP BY c.id
      ORDER BY rental_count DESC
      LIMIT 5
    `);

    // Обща статистика
    const [totalStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT rr.id) as total_rentals,
        COALESCE(SUM(rr.total_price), 0) as total_revenue,
        COUNT(DISTINCT u.id) as total_clients,
        COUNT(DISTINCT c.id) as total_cars
      FROM rental_requests rr
      LEFT JOIN users u ON rr.user_id = u.id AND u.role = 'client'
      LEFT JOIN cars c ON 1=1
      WHERE rr.status IN ('approved', 'completed')
    `);

    res.json({
      status_counts: statusCounts,
      top_cars: topCars,
      total_stats: totalStats[0]
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Грешка при зареждане на dashboard' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Възникна грешка на сървъра' });
});

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Luxe Auto Resort Server running on http://localhost:${PORT}`);
});

module.exports = app;

