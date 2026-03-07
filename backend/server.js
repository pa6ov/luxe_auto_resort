const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');
const readline = require('readline');

// Import routes
const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const templatesRoutes = require('./routes/templates');
const requestsRoutes = require('./routes/requests');
const costsRoutes = require('./routes/costs');
const contactsRoutes = require('./routes/contacts');
const commentsRoutes = require('./routes/comments');

// Import error handling utilities
const { errorHandler, notFoundHandler } = require('./utils/errors');

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
      success: true,
      status_counts: statusCounts,
      top_cars: topCars,
      total_stats: totalStats[0]
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: { 
        message: 'Грешка при зареждане на dashboard', 
        code: 'DASHBOARD_ERROR' 
      } 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = 3000;
const localIP = getLocalIP();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log('\n🚀 Server running on port ' + PORT);
  console.log('\n📱 Open in browser:');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log('\n⌨️  Keyboard shortcuts:');
  console.log('   r - Restart server');
  console.log('   x - Exit\n');
  
  // Enable keyboard input
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  
  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'r') {
      console.log('\n🔄 Restarting server...');
      server.close(() => {
        process.exit(0);
      });
    } else if (key.name === 'x' || key.ctrl === 'c') {
      console.log('\n👋 Exiting...');
      server.close(() => {
        process.exit(0);
      });
    }
  });
});

module.exports = app;

