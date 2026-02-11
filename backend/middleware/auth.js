const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'luxe_auto_resort_secret_key_2024';

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Трябва да сте влезли в профила си' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Невалиден токен' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Достъп отказан. Изисква се администратор' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin, JWT_SECRET };

