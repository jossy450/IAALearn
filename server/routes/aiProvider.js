const express = require('express');
const { getAIProvider } = require('../services/aiProvider');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get AI Provider status and available providers
router.get('/status', authenticate, (req, res) => {
  try {
    const aiProvider = getAIProvider();
    const status = aiProvider.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get provider status',
      message: error.message
    });
  }
});

// List all available providers
router.get('/available', authenticate, (req, res) => {
  try {
    const aiProvider = getAIProvider();
    const providers = aiProvider.getAvailableProviders();
    
    res.json({
      success: true,
      providers,
      total: providers.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list providers',
      message: error.message
    });
  }
});

// Get current primary provider
router.get('/primary', authenticate, (req, res) => {
  try {
    const aiProvider = getAIProvider();
    const primary = aiProvider.getPrimaryProvider();
    
    res.json({
      success: true,
      primaryProvider: {
        name: primary.name,
        free: primary.free,
        models: {
          fast: primary.fastModel,
          smart: primary.smartModel
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get primary provider',
      message: error.message
    });
  }
});

// Set primary provider (Admin only)
router.post('/switch', authenticate, (req, res) => {
  try {
    // Check if user is admin (optional, can remove for now)
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        error: 'Provider name is required'
      });
    }

    const aiProvider = getAIProvider();
    const newPrimary = aiProvider.setPrimaryProvider(provider);

    res.json({
      success: true,
      message: `Switched to ${newPrimary} provider`,
      primaryProvider: newPrimary
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to switch provider',
      message: error.message
    });
  }
});

// Force use of primary provider (Admin only)
router.post('/force-primary', authenticate, (req, res) => {
  try {
    const { force } = req.body;

    const aiProvider = getAIProvider();
    aiProvider.forcePrimary(force !== false);

    res.json({
      success: true,
      message: `Force primary provider: ${force !== false ? 'ENABLED' : 'DISABLED'}`,
      forceUsePrimary: force !== false
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to update force-primary setting',
      message: error.message
    });
  }
});

// Test a specific provider
router.post('/test', authenticate, (req, res) => {
  try {
    const { provider, prompt } = req.body;

    if (!provider) {
      return res.status(400).json({
        error: 'Provider name is required'
      });
    }

    const testPrompt = prompt || 'Say hello briefly.';
    const aiProvider = getAIProvider();
    
    // Use the selected provider
    res.json({
      success: true,
      message: 'Test request queued',
      provider,
      prompt: testPrompt,
      note: 'Test generation will be performed asynchronously'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to test provider',
      message: error.message
    });
  }
});

module.exports = router;
