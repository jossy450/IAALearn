const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Free Neural Net Transcription Service
 * Uses only FREE open-source and free-tier AI models
 * No paid API keys required
 */
class FreeNeuralTranscriptionService {
  constructor() {
    this.providers = this.initializeProviders();
    this.cache = new Map();
    this.cacheMaxSize = 100; // Limit cache size
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.audioPreprocessing = true; // Enable preprocessing
    this.minAudioDuration = 1000; // Minimum 1 second
  }

  initializeProviders() {
    /**
     * Build a list of available transcription providers. The order in which
     * providers are added here determines their fallback priority: the first
     * provider that succeeds will short‑circuit the rest. Providers that
     * require API keys will only be included if the corresponding key is
     * defined in the environment.
     */
    const providers = [];

    // 1. Prefer OpenAI Whisper when an API key is configured. OpenAI's
    // transcription endpoint accepts a wide range of formats including
    // WebM directly, so no conversion is necessary. Because OpenAI is more
    // reliable than the Hugging Face free endpoint, place it first.
    
    if (process.env.GROK_API_KEY) {
      providers.push({
        name: 'Grok STT (FREE)',
        priority: 1,
        transcribe: this.transcribeGrok.bind(this),
        requiresKey: true
      });
    }

    // 1b. If an xAI Grok API key is provided, include the experimental
    // Grok speech‑to‑text provider. xAI announced standalone STT endpoints
    // in late 2025. This implementation assumes a REST endpoint at
    // https://api.x.ai/v1/audio/transcriptions (or an override via
    // GROK_API_URL). It sends the audio file as multipart/form-data along
    // with the model and language. If the endpoint is unavailable, this
    // provider will fail and fall back to the next provider.
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: 'OpenAI Whisper',
        priority: providers.length + 1,
        transcribe: this.transcribeOpenAI.bind(this),
        requiresKey: true
      });
    }
    // 2. Use Hugging Face’s free inference API as a fallback. This API
    // hosts the OpenAI Whisper model and does not require any API key. It
    // only accepts WAV/MP3/FLAC, so WebM/OGG/OPUS must be converted. The
    // call can occasionally be rate‑limited or return errors when the
    // service is overloaded, so we attempt it after OpenAI.
    providers.push({
      name: 'Hugging Face (FREE)',
      priority: providers.length + 1,
      transcribe: this.transcribeHuggingFace.bind(this),
      requiresKey: false
    });

    // 3. Coqui STT - FREE, open‑source (local or cloud). Requires model
    // downloads and installation. Included for completeness but usually
    // skipped in hosted environments because the models are not bundled.
    providers.push({
      name: 'Coqui STT (FREE)',
      priority: providers.length + 1,
      transcribe: this.transcribeCoqui.bind(this),
      requiresKey: false
    });

    // 4. Wav2Vec 2.0 (Facebook) - FREE, open‑source. Also requires
    // installation of transformers.js and downloading the model. This
    // provider may be heavy and is therefore placed after Coqui.
    providers.push({
      name: 'Wav2Vec 2.0 (FREE)',
      priority: providers.length + 1,
      transcribe: this.transcribeWav2Vec.bind(this),
      requiresKey: false
    });

    // 5. Silero STT - FREE, lightweight. Note that this library is
    // primarily for voice activity detection and not full transcription.
    providers.push({
      name: 'Silero STT (FREE)',
      priority: providers.length + 1,
      transcribe: this.transcribeSilero.bind(this),
      requiresKey: false
    });

    return providers;
  }

  /**
   * Main transcription method with fallback support and caching
   */
  async transcribeAudio(audioBuffer, format = 'webm', language = 'en') {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }

    if (audioBuffer.length < 1000) {
      throw new Error('Audio too short - please record at least 1 second');
    }

    // Check cache first (use buffer hash as key)
    const cacheKey = this.generateCacheKey(audioBuffer, format, language);
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      const cached = this.cache.get(cacheKey);
      console.log(`⚡ Cache hit! (${this.cacheHits} hits, ${this.cacheMisses} misses)`);
      return {
        ...cached,
        cached: true,
        duration: 0
      };
    }
    this.cacheMisses++;

    // Preprocess audio for better results
    if (this.audioPreprocessing) {
      audioBuffer = await this.preprocessAudio(audioBuffer, format);
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

        const response = {
          success: true,
          text: result.text,
          provider: provider.name,
          confidence: result.confidence || null,
          duration,
          timestamp: new Date().toISOString(),
          cached: false
        };

        // Store in cache
        this.cache.set(cacheKey, response);

        // Limit cache size
        if (this.cache.size > this.cacheMaxSize) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }

        return response;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  ${provider.name} failed: ${error.message}`);
        continue; // Try next provider
      }
    }

    throw new Error(`All transcription providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate cache key from audio buffer
   */
  generateCacheKey(audioBuffer, format, language) {
    const crypto = require('crypto');
    // Use first and last 1KB + size for fast hashing
    const sample = Buffer.concat([
      audioBuffer.slice(0, 1024),
      audioBuffer.slice(-1024)
    ]);
    const hash = crypto.createHash('md5').update(sample).digest('hex');
    return `${hash}:${audioBuffer.length}:${format}:${language}`;
  }

  /**
   * Preprocess audio for better transcription
   */
  async preprocessAudio(audioBuffer, format) {
    try {
      // Basic preprocessing: normalize volume, reduce noise
      // This is a placeholder - in production, use actual audio processing
      // For now, just validate and return

      // Check if audio is too quiet (all values near zero)
      const sample = audioBuffer.slice(0, Math.min(1000, audioBuffer.length));
      const avgAmplitude = sample.reduce((sum, val) => sum + Math.abs(val), 0) / sample.length;

      if (avgAmplitude < 5) {
        console.warn('⚠️  Audio appears very quiet - may affect transcription quality');
      }

      return audioBuffer;
    } catch (error) {
      console.warn('Audio preprocessing failed:', error.message);
      return audioBuffer; // Return original on error
    }
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

      // Hugging Face currently supports formats like WAV, MP3 and FLAC.
      // WebM, OGG and OPUS are converted to WAV for compatibility. If conversion
      // fails (e.g. ffmpeg is not installed), the error will be caught and this
      // provider will be skipped in favour of the next fallback.
      let payloadBuffer = audioBuffer;
      if ([ 'webm', 'ogg', 'opus' ].includes(format)) {
        console.log(`   Converting ${format} to wav for Hugging Face...`);
        payloadBuffer = await this.convertToWav(audioBuffer, format);
        format = 'wav';
      }

      // Determine appropriate content type for request. MP3 uses audio/mpeg,
      // otherwise we use audio/<format> (e.g. audio/wav, audio/flac).
      const contentType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;

      // Use axios for HTTP requests instead of the global fetch API. On some
      // server environments (like Node.js < 18), fetch may not be defined.
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/openai/whisper-small',
        payloadBuffer,
        {
          headers: {
            'Content-Type': contentType
          },
          // Hugging Face endpoints can take a few seconds to respond; set a
          // generous timeout to avoid premature termination (default is 0 = no timeout).
          timeout: 30000
        }
      );

      const result = response.data;
      // Validate the response structure. Hugging Face returns an object with a
      // `text` property on success. If missing, consider it an error.
      if (!result || typeof result !== 'object' || !result.text) {
        throw new Error('Hugging Face returned no transcription text');
      }

      return {
        text: result.text || '',
        confidence: null
      };
    } catch (error) {
      // Normalise errors from axios and other sources. Axios errors include
      // `response` with status and data. Expose useful information to callers.
      const msg =
        error.response?.data?.error ||
        error.response?.statusText ||
        error.message;
      throw new Error(`Hugging Face error: ${msg}`);
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
          response_format: 'verbose_json', // Get more metadata
          temperature: 0.0 // More deterministic
        });

        // Handle both response formats
        let text, confidence;
        if (typeof transcription === 'string') {
          text = transcription;
          confidence = null;
        } else {
          text = transcription.text;
          // Calculate confidence from segments if available
          if (transcription.segments && transcription.segments.length > 0) {
            const avgConfidence = transcription.segments.reduce(
              (sum, seg) => sum + (seg.no_speech_prob || 0), 0
            ) / transcription.segments.length;
            confidence = 1 - avgConfidence; // Invert no_speech_prob
          }
        }

        if (!text || text.trim().length === 0) {
          throw new Error('OpenAI Whisper returned empty transcription');
        }

        console.log(`✅ OpenAI Whisper transcribed ${text.length} chars with confidence: ${confidence || 'N/A'}`);

        return {
          text: text.trim(),
          confidence
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
   * xAI Grok Speech‑to‑Text - Experimental
   *
   * In late 2025, xAI announced standalone speech‑to‑text endpoints as part of
   * their Grok Voice stack. If a GROK_API_KEY environment variable is set,
   * this provider will attempt to send the audio to the Grok STT API. The
   * endpoint can be overridden via the GROK_API_URL environment variable. If
   * the call fails (e.g. because the endpoint doesn’t exist or returns an
   * error), the error will propagate and the next provider will be tried.
   */
  async transcribeGrok(audioBuffer, format, language) {
    try {
      console.log('🦁 Grok STT processing...');
      console.log(`   Audio size: ${audioBuffer.length} bytes, format: ${format}`);

      // Convert unsupported formats to WAV. xAI’s STT API is expected to
      // support common audio formats like wav, mp3 and flac. We convert
      // WebM, Ogg and Opus to WAV for compatibility.
      let payloadBuffer = audioBuffer;
      let fileFormat = format;
      if (['webm', 'ogg', 'opus'].includes(format)) {
        console.log(`   Converting ${format} to wav for Grok STT...`);
        payloadBuffer = await this.convertToWav(audioBuffer, format);
        fileFormat = 'wav';
      }

      // Determine MIME type for the uploaded file
      const contentType = fileFormat === 'mp3' ? 'audio/mpeg' : `audio/${fileFormat}`;

      // Build multipart/form-data payload
      const formData = new FormData();
      // Append audio buffer as a file. The form-data library will set the
      // appropriate Content-Type header for the part.
      formData.append('file', payloadBuffer, {
        filename: `audio.${fileFormat}`,
        contentType
      });

      // Optionally specify a model. If GROK_STT_MODEL is defined use it,
      // otherwise rely on the provider’s default model. xAI has not publicly
      // documented their STT model names yet, so this parameter may be
      // ignored by the API.
      if (process.env.GROK_STT_MODEL) {
        formData.append('model', process.env.GROK_STT_MODEL);
      }
      // Pass through language hint if provided (e.g. "en", "fr", etc.)
      if (language) {
        formData.append('language', language);
      }

      // Endpoint configuration: allow override via env, default to xAI STT path
      const endpoint = process.env.GROK_API_URL || 'https://api.x.ai/v1/audio/transcriptions';

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          // Merge form-data headers (e.g. Content-Type with boundary)
          ...formData.getHeaders()
        },
        // A generous timeout for uploading and processing large audio files
        timeout: 60000
      });

      const result = response.data;
      if (!result || typeof result !== 'object' || !result.text) {
        throw new Error('Grok STT returned no transcription text');
      }

      return {
        text: result.text,
        confidence: result.confidence || null
      };
    } catch (error) {
      // Normalize error messages. Axios errors may contain nested response data.
      const msg = error.response?.data?.error || error.response?.statusText || error.message;
      throw new Error(`Grok STT error: ${msg}`);
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
    if (format === 'wav') {
      return audioBuffer;
    }

    let ffmpeg;
    let ffmpegPath;
    try {
      ffmpeg = require('fluent-ffmpeg');
      ffmpegPath = require('ffmpeg-static');
    } catch (e) {
      throw new Error('Audio conversion requires ffmpeg. Install: npm install fluent-ffmpeg ffmpeg-static');
    }

    if (!ffmpegPath) {
      throw new Error('ffmpeg binary not found. Install: npm install ffmpeg-static');
    }

    ffmpeg.setFfmpegPath(ffmpegPath);

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `audio-input-${Date.now()}.${format}`);
    const outputPath = path.join(tempDir, `audio-output-${Date.now()}.wav`);

    try {
      fs.writeFileSync(inputPath, audioBuffer);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('wav')
          .on('error', (err) => reject(err))
          .on('end', () => resolve())
          .save(outputPath);
      });

      const wavBuffer = fs.readFileSync(outputPath);
      if (!wavBuffer || wavBuffer.length === 0) {
        throw new Error('Audio conversion produced empty file');
      }

      return wavBuffer;
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp audio files:', cleanupError.message);
      }
    }
  }

  /**
   * Helper: Delay for polling
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new FreeNeuralTranscriptionService();
