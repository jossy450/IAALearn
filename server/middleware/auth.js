const jwt = require('jsonwebtoken');

// Get JWT secret dynamically from environment
const getJwtSecret = () => process.env.JWT_SECRET || 'demo-secret';

// Support legacy/rotated secrets to avoid locking out admins after deployments.
const getLegacySecrets = () => {
  const raw = process.env.LEGACY_JWT_SECRETS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const verifyToken = (token) => {
  // Try current secret first
  const primarySecret = getJwtSecret();
  const legacySecrets = getLegacySecrets();

  const tryVerify = (secret) => jwt.verify(token, secret);

  try {
    return tryVerify(primarySecret);
  } catch (primaryErr) {
    // If the primary fails, attempt any legacy secrets to allow previously issued tokens
    for (const legacy of legacySecrets) {
      try {
        console.warn('[AUTH] Primary JWT secret rejected token, trying legacy secret');
        return tryVerify(legacy);
      } catch (_) {
        // keep trying
      }
    }
    // If all attempts failed, surface the original error for accurate messaging
    throw primaryErr;
  }
};

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
