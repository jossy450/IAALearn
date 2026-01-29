const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Free Neural Net Transcription Service
 * Uses only FREE open-source and free-tier AI models
 * No paid API keys required
 */
class FreeNeuralTranscriptionService {
  constructor() {
    this.providers = this.initializeProviders();
    this.cache = new Map();
  }

  initializeProviders() {
    const providers = [];

    // 1. Hugging Face Inference API - FREE tier (generous limits)
    providers.push({
      name: 'Hugging Face (FREE)',
      priority: 1,
      transcribe: this.transcribeHuggingFace.bind(this),
      requiresKey: false // No key needed for inference API endpoints
    });

    // 2. OpenAI Whisper Local - FREE to use (if API key available)
    // Can also run locally with npm package
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: 'OpenAI Whisper',
        priority: 2,
        transcribe: this.transcribeOpenAI.bind(this),
        requiresKey: true
      });
    }

    // 3. Coqui STT - FREE, open-source (local or cloud)
    providers.push({
      name: 'Coqui STT (FREE)',
      priority: 3,
      transcribe: this.transcribeCoqui.bind(this),
      requiresKey: false
    });

    // 4. Wav2Vec 2.0 (Facebook) - FREE, open-source
    providers.push({
      name: 'Wav2Vec 2.0 (FREE)',
      priority: 4,
      transcribe: this.transcribeWav2Vec.bind(this),
      requiresKey: false
    });

    // 5. Silero STT - FREE, lightweight
    providers.push({
      name: 'Silero STT (FREE)',
      priority: 5,
      transcribe: this.transcribeSilero.bind(this),
      requiresKey: false
    });

    return providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Main transcription method with fallback support
   */
  async transcribeAudio(audioBuffer, format = 'webm', language = 'en') {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }

    if (audioBuffer.length < 1000) {
      throw new Error('Audio too short - please record at least 1 second');
    }

    const providers = this.getAvailableProviders();
    if (providers.length === 0) {
      throw new Error('No transcription providers available. Install node-wav2vec or set OPENAI_API_KEY.');
    }

    let lastError = null;
    const startTime = Date.now();

    for (const provider of providers) {
      try {
        console.log(`🎤 Attempting transcription with ${provider.name}...`);
        
        const result = await provider.transcribe(audioBuffer, format, language);
        const duration = Date.now() - startTime;

        return {
          success: true,
          text: result.text,
          provider: provider.name,
          confidence: result.confidence || null,
          duration,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  ${provider.name} failed: ${error.message}`);
        continue; // Try next provider
      }
    }

    throw new Error(`All transcription providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  getAvailableProviders() {
    return this.providers;
  }

  /**
   * Hugging Face Inference API - FREE (no key needed)
   * Uses OpenAI Whisper model hosted on HF
   */
  async transcribeHuggingFace(audioBuffer, format, language) {
    try {
      console.log('🤗 Hugging Face processing...');
      console.log(`   Audio size: ${audioBuffer.length} bytes, format: ${format}`);
      
      // Hugging Face requires WAV, MP3, or FLAC
      // WebM is not supported - need to convert or skip this provider
      if (format === 'webm' || format === 'ogg' || format === 'opus') {
        throw new Error(`Hugging Face doesn't support ${format}. Try OpenAI Whisper or use WAV/MP3 format.`);
      }

      // Use Hugging Face's free Whisper endpoint
      const response = await fetch('https://api-inference.huggingface.co/models/openai/whisper-small', {
        method: 'POST',
        body: audioBuffer,
        headers: {
          'Content-Type': 'audio/wav'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();

      if (!result.text) {
        throw new Error('Hugging Face returned no transcription text');
      }

      return {
        text: result.text || '',
        confidence: null
      };
    } catch (error) {
      throw new Error(`Hugging Face error: ${error.message}`);
    }
  }

  /**
   * OpenAI Whisper - Works with WebM, WAV, MP3, etc.
   */
  async transcribeOpenAI(audioBuffer, format, language) {
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      console.log('🤖 OpenAI Whisper processing...');
      console.log(`   Audio size: ${audioBuffer.length} bytes, format: ${format}`);

      let tempFilePath = null;
      try {
        const tempDir = os.tmpdir();
        // Use proper file extension for the format
        const ext = format === 'webm' ? 'webm' : format;
        tempFilePath = path.join(tempDir, `audio-${Date.now()}.${ext}`);
        fs.writeFileSync(tempFilePath, audioBuffer);

        const audioStream = fs.createReadStream(tempFilePath);

        const transcription = await client.audio.transcriptions.create({
          file: audioStream,
          model: 'whisper-1',
          language: language === 'en' ? 'en' : language,
          response_format: 'text'
        });

        // OpenAI Whisper returns plain text when response_format='text'
        const text = typeof transcription === 'string' ? transcription : transcription.text;

        if (!text || text.trim().length === 0) {
          throw new Error('OpenAI Whisper returned empty transcription');
        }

        return {
          text: text.trim(),
          confidence: null
        };
      } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.warn('Failed to cleanup temp file:', e.message);
          }
        }
      }
    } catch (error) {
      // Provide clearer error messages
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key not configured or invalid');
      }
      if (error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded');
      }
      throw new Error(`OpenAI Whisper error: ${error.message}`);
    }
  }

  /**
   * Coqui STT - FREE, open-source speech-to-text
   * Requires: npm install coqui-stt
   */
  async transcribeCoqui(audioBuffer, format, language) {
    try {
      console.log('🎙️ Coqui STT processing...');
      
      let coquiSTT;
      try {
        coquiSTT = require('coqui-stt');
      } catch (e) {
        throw new Error('Coqui STT not installed. Install: npm install coqui-stt');
      }

      // Convert audio to WAV if needed
      const wavBuffer = await this.convertToWav(audioBuffer, format);

      // Create model instance
      const model = new coquiSTT.Model('/path/to/model.pbmm');
      const scorer = new coquiSTT.Scorer('/path/to/scorer.scorer');
      model.enableExternalScorer(scorer);

      // Transcribe
      const text = model.sttWAV(wavBuffer);

      return {
        text: text || '',
        confidence: null
      };
    } catch (error) {
      throw new Error(`Coqui STT error: ${error.message}`);
    }
  }

  /**
   * Wav2Vec 2.0 - FREE, Facebook's neural model
   * Requires: npm install transformers
   */
  async transcribeWav2Vec(audioBuffer, format, language) {
    try {
      console.log('📊 Wav2Vec 2.0 processing...');

      let transformers;
      try {
        transformers = require('transformers');
      } catch (e) {
        throw new Error('Transformers.js not installed. Install: npm install transformers');
      }

      // Use Facebook's Wav2Vec model
      const pipe = await transformers.pipeline(
        'automatic-speech-recognition',
        'facebook/wav2vec2-base-960h'
      );

      // Convert buffer to audio format
      const audioPath = await this.saveAudioTempFile(audioBuffer, format);
      
      const result = await pipe(audioPath);

      // Clean up
      try {
        fs.unlinkSync(audioPath);
      } catch (e) {}

      return {
        text: result.text || result || '',
        confidence: null
      };
    } catch (error) {
      throw new Error(`Wav2Vec 2.0 error: ${error.message}`);
    }
  }

  /**
   * Silero STT - FREE, lightweight Russian/English model
   * Requires: npm install silero-vad-js
   */
  async transcribeSilero(audioBuffer, format, language) {
    try {
      console.log('🎯 Silero STT processing...');

      let sileroVad;
      try {
        sileroVad = require('silero-vad-js');
      } catch (e) {
        throw new Error('Silero not installed. Install: npm install silero-vad-js');
      }

      // Prepare audio
      const audioPath = await this.saveAudioTempFile(audioBuffer, format);

      // Use Silero model (works with Russian/English)
      // Note: Silero is primarily VAD (voice activity detection)
      // For STT, combine with another model or use Google free tier
      
      throw new Error('Silero is primarily for VAD. For STT, use Hugging Face or OpenAI.');
    } catch (error) {
      throw new Error(`Silero error: ${error.message}`);
    }
  }

  /**
   * Helper: Save audio to temp file
   */
  async saveAudioTempFile(audioBuffer, format) {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `audio-${Date.now()}.${format}`);
    fs.writeFileSync(filePath, audioBuffer);
    return filePath;
  }

  /**
   * Helper: Prepare audio data for API
   */
  async prepareAudioData(audioBuffer, format) {
    // For Hugging Face, we can send raw buffer
    // But ideally convert to WAV format first
    if (format === 'wav') {
      return audioBuffer;
    }

    // For other formats, try to convert
    // This is a simplified version - in production, use ffmpeg
    return audioBuffer;
  }

  /**
   * Helper: Convert audio to WAV
   */
  async convertToWav(audioBuffer, format) {
    // This would require ffmpeg or audio conversion library
    // For now, return as-is (works for WAV format)
    if (format === 'wav') {
      return audioBuffer;
    }
    
    // For production, use: npm install fluent-ffmpeg
    throw new Error(`Audio format ${format} conversion requires ffmpeg. Install: npm install fluent-ffmpeg`);
  }

  /**
   * Helper: Delay for polling
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new FreeNeuralTranscriptionService();
