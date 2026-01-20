const express = require('express');
const multer = require('multer');
const transcriptionService = require('../services/transcription');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

// Transcribe audio file
router.post('/transcribe', authenticate, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const format = req.body.format || 'webm';
    const result = await transcriptionService.transcribeAudio(req.file.buffer, format);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Health check for transcription service
router.get('/status', authenticate, async (req, res) => {
  res.json({
    status: 'operational',
    service: 'OpenAI Whisper',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
