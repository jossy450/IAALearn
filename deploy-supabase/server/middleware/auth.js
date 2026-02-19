const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret';

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const authenticate = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const queryToken = req.query?.token;
    const token = headerToken || queryToken;

    if (!token) {
      if (process.env.DEMO_MODE === 'true') {
        req.user = {
          id: 'demo-user-1',
          email: 'demo@example.com',
          role: 'user',
        };
        return next();
      }
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    next(error);
  }
};

module.exports = { authenticate, verifyToken };
