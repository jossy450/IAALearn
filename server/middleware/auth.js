const jwt = require('jsonwebtoken');

// Get JWT secret dynamically from environment
const getJwtSecret = () => process.env.JWT_SECRET || 'demo-secret';

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

const authenticate = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const queryToken = req.query?.token;
    const token = headerToken || queryToken;

    if (!token) {
      console.log(`[AUTH] No token provided for ${req.method} ${req.path}`);
      if (process.env.DEMO_MODE === 'true') {
        console.log('[AUTH] Demo mode - allowing anonymous access');
        // In demo mode, allow anonymous access as the seeded demo user
        req.user = {
          id: 'demo-user-1',
          email: 'demo@example.com',
          role: 'user',
        };
        return next();
      }
      return res.status(401).json({ error: 'Authentication required', details: 'No token provided' });
    }

    try {
      const decoded = verifyToken(token);
      console.log(`[AUTH] ✓ Token verified for user: ${decoded.email}`);
      req.user = decoded;
      next();
    } catch (verifyErr) {
      console.error(`[AUTH] Token verification failed: ${verifyErr.message}`);
      throw verifyErr;
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.error(`[AUTH] JWT verification error for ${req.method} ${req.path}:`, error.message);
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
    if (error.name === 'TokenExpiredError') {
      console.error(`[AUTH] JWT token expired for ${req.method} ${req.path}:`, error.message);
      return res.status(401).json({ error: 'Token expired', details: error.message });
    }
    console.error(`[AUTH] Unexpected error for ${req.method} ${req.path}:`, error);
    next(error);
  }
};

module.exports = { authenticate, verifyToken, getJwtSecret };
