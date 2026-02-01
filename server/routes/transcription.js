const express = require('express');
const multer = require('multer');
const path = require('path');
const freeNeuralTranscriptionService = require('../services/freeNeuralTranscription');
const { getAIProvider } = require('../services/aiProvider');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const aiProvider = getAIProvider();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const normalizeMime = (mime = '') => mime.split(';')[0].trim().toLowerCase();
const mimeToFormat = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac'
};
const allowedMimes = new Set(Object.keys(mimeToFormat));
const allowedExtensions = new Set(['webm', 'wav', 'mp3', 'mpeg', 'ogg', 'opus', 'mp4', 'm4a', 'aac']);

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (AssemblyAI/Deepgram support larger files)
  },
  fileFilter: (req, file, cb) => {
    const mime = normalizeMime(file.mimetype);
    const ext = path.extname(file.originalname || '').replace('.', '').toLowerCase();
    const isAllowed = allowedMimes.has(mime) || allowedExtensions.has(ext);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio format: ${file.mimetype}. Allowed: webm, wav, mp3, ogg, mp4, m4a`));
    }
  }
});

// Transcribe audio file - optimized with OpenAI Whisper
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        details: 'Please record audio before submitting'
      });
    }

    const normalizedMime = normalizeMime(req.file.mimetype);
    const formatFromMime = mimeToFormat[normalizedMime];
    const formatFromName = path.extname(req.file.originalname || '').replace('.', '').toLowerCase();
    const format = (req.body.format || formatFromMime || formatFromName || 'webm').toLowerCase();
    const language = req.body.language || 'en';
    
    // Check minimum audio size (at least 1KB for valid audio)
    if (req.file.size < 1000) {
      return res.status(400).json({
        error: 'Audio too short',
        message: 'Please record at least 1 second of audio',
        details: 'Recording was too brief to transcribe'
      });
    }
    
    console.log(`🎤 Transcribing audio: ${req.file.size} bytes, format: ${format}, language: ${language}`);

    const result = await freeNeuralTranscriptionService.transcribeAudio(req.file.buffer, format, language);

    console.log(`✅ Transcription successful with ${result.provider}: "${result.text.substring(0, 50)}..." (${result.duration}ms)`);

    res.json(result);
  } catch (error) {
    console.error('❌ Transcription error:', error.message);
    
    // Send detailed error to client
    res.status(400).json({
      error: 'Transcription failed',
      message: error.message,
      details: 'Please check:\n- Speak clearly into microphone\n- Record for at least 2-3 seconds\n- Ensure microphone permissions granted\n- Try again with clearer audio',
      providers: freeNeuralTranscriptionService.getAvailableProviders().map(p => p.name)
    });
  }
});

// Get available transcription providers and health status (optimized)
router.get('/status', authenticate, async (req, res) => {
  const providers = freeNeuralTranscriptionService.getAvailableProviders();
  const stats = freeNeuralTranscriptionService.cache;
  
  res.json({
    status: 'operational',
    service: 'Neural Net Multi-Provider Transcription',
    availableProviders: providers.map(p => ({
      name: p.name,
      priority: p.priority,
      requiresKey: p.requiresKey || false
    })),
    primaryProvider: providers[0]?.name || 'None configured',
    totalProviders: providers.length,
    cacheStats: {
      size: stats.size,
      hits: freeNeuralTranscriptionService.cacheHits || 0,
      misses: freeNeuralTranscriptionService.cacheMisses || 0,
      hitRate: freeNeuralTranscriptionService.cacheHits > 0 
        ? ((freeNeuralTranscriptionService.cacheHits / (freeNeuralTranscriptionService.cacheHits + freeNeuralTranscriptionService.cacheMisses)) * 100).toFixed(2) + '%'
        : '0%'
    },
    aiIntegration: {
      available: true,
      provider: aiProvider.getPrimaryProvider()?.name || 'none',
      features: ['enhancement', 'grammar_fix', 'punctuation']
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
