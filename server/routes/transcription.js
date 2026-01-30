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

// Transcribe audio file - optimized with OpenAI Whisper
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

// Get available transcription providers and health status
router.get('/status', authenticate, async (req, res) => {
  const providers = freeNeuralTranscriptionService.getAvailableProviders();
  
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
