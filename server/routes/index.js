const express = require('express');
const authRoutes = require('./auth');
const sessionRoutes = require('./sessions');
const transcriptionRoutes = require('./transcription');
const answersRoutes = require('./answers');
const optimizedAnswersRoutes = require('./optimizedAnswers');
const cacheRoutes = require('./cache');
const analyticsRoutes = require('./analytics');
const privacyRoutes = require('./privacy');
const mobileRoutes = require('./mobile');
const smartAIRoutes = require('./smartAI');
const transferRoutes = require('./transfer');
const documentsRoutes = require('./documents');
const adminRoutes = require('./admin');
const aiProviderRoutes = require('./aiProvider');
const pushRoutes = require('./push');
const subscriptionsRoutes = require('./subscriptions');

const router = express.Router();

// Route organization
router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/sessions', transferRoutes); // QR transfer routes under /sessions
router.use('/transcription', transcriptionRoutes);
router.use('/answers', answersRoutes); // Legacy answer routes
router.use('/answers-optimized', optimizedAnswersRoutes); // Optimized answer routes with streaming
router.use('/cache', cacheRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/privacy', privacyRoutes);
router.use('/mobile', mobileRoutes);
router.use('/smart-ai', smartAIRoutes);
router.use('/documents', documentsRoutes); // Document upload/management routes
router.use('/admin', adminRoutes); // Admin dashboard routes
router.use('/ai-provider', aiProviderRoutes); // AI provider management and switching

router.use('/push', pushRoutes); // Push notifications
router.use('/subscriptions', subscriptionsRoutes); // Subscription management endpoints

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Interview Answer Assistant API',
    version: '2.0.1',
    features: [
      'Smart AI',
      'Context Learning',
      'Question Prediction',
      'Answer Analysis',
      'Streaming Responses',
      'Multi-Layer Caching',
      'Performance Optimization'
    ],
    endpoints: {
      auth: '/api/auth',
      sessions: '/api/sessions',
      transcription: '/api/transcription',
      answers: '/api/answers',
      answersOptimized: '/api/answers-optimized',
      cache: '/api/cache',
      analytics: '/api/analytics',
      privacy: '/api/privacy',
      mobile: '/api/mobile',
      smartAI: '/api/smart-ai',
      documents: '/api/documents',
      admin: '/api/admin'
    },
    performance: {
      caching: 'Enabled',
      streaming: 'Supported',
      targetResponseTime: '< 2 seconds'
    }
  });
});

module.exports = router;
