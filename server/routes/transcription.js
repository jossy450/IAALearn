const express = require('express');
const multer = require('multer');
const freeNeuralTranscriptionService = require('../services/freeNeuralTranscription');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (AssemblyAI/Deepgram support larger files)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/opus'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio format: ${file.mimetype}. Allowed: webm, wav, mp3, ogg`));
    }
  }
});

// Transcribe audio file with neural net AI models
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        details: 'Please record audio before submitting'
      });
    }

    const format = req.body.format || 'webm';
    const language = req.body.language || 'en';
    
    console.log(`🎤 Transcribing audio: ${req.file.size} bytes, format: ${format}, language: ${language}`);

    const result = await freeNeuralTranscriptionService.transcribeAudio(req.file.buffer, format, language);

    console.log(`✅ Transcription successful with ${result.provider}: "${result.text.substring(0, 50)}..." (${result.duration}ms)`);

    res.json(result);
  } catch (error) {
    console.error('❌ Transcription error:', error.message);
    
    // Send detailed error to client
    res.status(500).json({
      error: 'Transcription failed',
      message: error.message,
      details: 'Please check:\n- Audio recording quality\n- Microphone permissions\n- API keys configured (AssemblyAI, Deepgram, Google Cloud, Azure, or OpenAI)',
      providers: neuralTranscriptionService.getAvailableProviders().map(p => p.name)
    });
  }
});

// Get available transcription providers and health status
router.get('/status', authenticate, async (req, res) => {
  const providers = neuralTranscriptionService.getAvailableProviders();
  
  res.json({
    status: 'operational',
    service: 'Neural Net Multi-Provider Transcription',
    availableProviders: providers.map(p => ({
      name: p.name,
      priority: p.priority
    })),
    primaryProvider: providers[0]?.name || 'None configured',
    totalProviders: providers.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
