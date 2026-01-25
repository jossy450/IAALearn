const express = require('express');
const authRoutes = require('./auth');
const sessionRoutes = require('./sessions');
const transcriptionRoutes = require('./transcription');
const answersRoutes = require('./answers');
const cacheRoutes = require('./cache');
const analyticsRoutes = require('./analytics');
const privacyRoutes = require('./privacy');
const mobileRoutes = require('./mobile');
const smartAIRoutes = require('./smartAI');
const transferRoutes = require('./transfer');

const router = express.Router();

// Route organization
router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/sessions', transferRoutes); // QR transfer routes under /sessions
router.use('/transcription', transcriptionRoutes);
router.use('/answers', answersRoutes);
router.use('/cache', cacheRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/privacy', privacyRoutes);
router.use('/mobile', mobileRoutes);
router.use('/smart-ai', smartAIRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Interview Answer Assistant API',
    version: '2.0.0',
    features: ['Smart AI', 'Context Learning', 'Question Prediction', 'Answer Analysis'],
    endpoints: {
      auth: '/api/auth',
      sessions: '/api/sessions',
      transcription: '/api/transcription',
      answers: '/api/answers',
      cache: '/api/cache',
      analytics: '/api/analytics',
      privacy: '/api/privacy',
      mobile: '/api/mobile',
      smartAI: '/api/smart-ai'
    }
  });
});

module.exports = router;
