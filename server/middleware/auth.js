const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const queryToken = req.query?.token;
    const token = headerToken || queryToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = { authenticate };
