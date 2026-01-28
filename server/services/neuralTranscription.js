const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Multi-provider Neural Net Transcription Service
 * Automatically tries multiple AI models for best results
 */
class NeuralTranscriptionService {
  constructor() {
    this.providers = this.initializeProviders();
    this.cache = new Map();
  }

  initializeProviders() {
    const providers = [];

    // 1. AssemblyAI - Best for real-time, great accuracy
    if (process.env.ASSEMBLYAI_API_KEY) {
      providers.push({
        name: 'AssemblyAI',
        priority: 1,
        transcribe: this.transcribeAssemblyAI.bind(this)
      });
    }

    // 2. Deepgram - Specialized for real-time transcription
    if (process.env.DEEPGRAM_API_KEY) {
      providers.push({
        name: 'Deepgram',
        priority: 2,
        transcribe: this.transcribeDeepgram.bind(this)
      });
    }

    // 3. Google Cloud Speech-to-Text
    if (process.env.GOOGLE_CLOUD_SPEECH_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      providers.push({
        name: 'Google Cloud Speech',
        priority: 3,
        transcribe: this.transcribeGoogleCloud.bind(this)
      });
    }

    // 4. Azure Speech Services
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      providers.push({
        name: 'Azure Speech',
        priority: 4,
        transcribe: this.transcribeAzure.bind(this)
      });
    }

    // 5. OpenAI Whisper - Reliable fallback
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        name: 'OpenAI Whisper',
        priority: 5,
        transcribe: this.transcribeOpenAI.bind(this)
      });
    }

    // Sort by priority
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
      throw new Error('No transcription providers configured. Set up at least one: ASSEMBLYAI_API_KEY, DEEPGRAM_API_KEY, GOOGLE_CLOUD_SPEECH_KEY, AZURE_SPEECH_KEY, or OPENAI_API_KEY');
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
   * AssemblyAI Transcription (Best for real-time)
   */
  async transcribeAssemblyAI(audioBuffer, format, language) {
    const axios = require('axios');
    
    try {
      // Step 1: Upload audio file
      console.log('📤 Uploading audio to AssemblyAI...');
      
      const uploadResponse = await axios.post('https://api.assemblyai.com/v1/upload', audioBuffer, {
        headers: {
          'Authorization': process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/octet-stream'
        }
      });

      const audioUrl = uploadResponse.data.upload_url;

      // Step 2: Submit for transcription
      console.log('🔄 Processing transcription request...');
      
      const transcribeResponse = await axios.post(
        'https://api.assemblyai.com/v1/transcript',
        {
          audio_url: audioUrl,
          language_code: language === 'en' ? 'en' : language,
          model: 'best', // Best neural net model
          speech_model: 'latest_best'
        },
        {
          headers: {
            'Authorization': process.env.ASSEMBLYAI_API_KEY
          }
        }
      );

      const transcriptId = transcribeResponse.data.id;

      // Step 3: Poll for results
      console.log('⏳ Waiting for transcription to complete...');
      
      let transcript = transcribeResponse.data;
      while (transcript.status !== 'completed' && transcript.status !== 'error') {
        await this.delay(1000);
        
        const statusResponse = await axios.get(
          `https://api.assemblyai.com/v1/transcript/${transcriptId}`,
          {
            headers: {
              'Authorization': process.env.ASSEMBLYAI_API_KEY
            }
          }
        );
        
        transcript = statusResponse.data;
      }

      if (transcript.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
      }

      return {
        text: transcript.text || '',
        confidence: transcript.confidence || null
      };
    } catch (error) {
      throw new Error(`AssemblyAI error: ${error.message}`);
    }
  }

  /**
   * Deepgram Transcription (Specialized for real-time)
   */
  async transcribeDeepgram(audioBuffer, format, language) {
    const axios = require('axios');
    
    try {
      console.log('🎙️  Deepgram processing...');
      
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true',
        audioBuffer,
        {
          headers: {
            'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': `audio/${format}`
          }
        }
      );

      const transcript = response.data.results?.channels?.[0]?.alternatives?.[0];
      if (!transcript) {
        throw new Error('No transcription results from Deepgram');
      }

      return {
        text: transcript.transcript || '',
        confidence: transcript.confidence || null
      };
    } catch (error) {
      throw new Error(`Deepgram error: ${error.message}`);
    }
  }

  /**
   * Google Cloud Speech-to-Text (Neural net powered)
   */
  async transcribeGoogleCloud(audioBuffer, format, language) {
    try {
      const speech = require('@google-cloud/speech');
      const client = new speech.SpeechClient();

      console.log('🔵 Google Cloud Speech processing...');

      const request = {
        config: {
          encoding: this.getGoogleAudioEncoding(format),
          sampleRateHertz: 16000,
          languageCode: language === 'en' ? 'en-US' : language,
          enableAutomaticPunctuation: true,
          model: 'latest_long', // Latest neural model
          useEnhanced: true
        },
        audio: {
          content: audioBuffer.toString('base64')
        }
      };

      const [response] = await client.recognize(request);
      const transcription = response.results
        ?.map(result => result.alternatives[0].transcript)
        .join('\n');

      return {
        text: transcription || '',
        confidence: null
      };
    } catch (error) {
      throw new Error(`Google Cloud Speech error: ${error.message}`);
    }
  }

  /**
   * Azure Speech Services (Enterprise neural model)
   */
  async transcribeAzure(audioBuffer, format, language) {
    try {
      const { SpeechRecognitionServiceClient } = require('@microsoft/cognitiveservices-speech-sdk');

      console.log('☁️  Azure Speech processing...');

      const speechConfig = SpeechRecognitionServiceClient.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION
      );

      speechConfig.speechRecognitionLanguage = language === 'en' ? 'en-US' : language;

      // Use audio buffer
      const audioConfig = {
        close: () => {},
        read: (buffer) => {
          buffer.set(audioBuffer.subarray(0, buffer.length));
          return Math.min(buffer.length, audioBuffer.length);
        }
      };

      const recognizer = new SpeechRecognitionServiceClient.SpeechRecognizer(speechConfig, audioConfig);

      return new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(
          result => {
            recognizer.close();
            if (result.reason === 'RecognizedSpeech') {
              resolve({
                text: result.text || '',
                confidence: null
              });
            } else {
              reject(new Error(`Azure recognition failed: ${result.errorDetails}`));
            }
          },
          error => {
            recognizer.close();
            reject(new Error(`Azure error: ${error}`));
          }
        );
      });
    } catch (error) {
      throw new Error(`Azure Speech error: ${error.message}`);
    }
  }

  /**
   * OpenAI Whisper (Reliable fallback)
   */
  async transcribeOpenAI(audioBuffer, format, language) {
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      console.log('🤖 OpenAI Whisper processing...');

      let tempFilePath = null;
      try {
        const tempDir = os.tmpdir();
        tempFilePath = path.join(tempDir, `audio-${Date.now()}.${format}`);
        fs.writeFileSync(tempFilePath, audioBuffer);

        const audioStream = fs.createReadStream(tempFilePath);

        const transcription = await client.audio.transcriptions.create({
          file: audioStream,
          model: 'whisper-1',
          language: language === 'en' ? 'en' : language,
          response_format: 'json'
        });

        return {
          text: transcription.text || '',
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
      throw new Error(`OpenAI Whisper error: ${error.message}`);
    }
  }

  /**
   * Helper: Convert audio format to Google Cloud encoding
   */
  getGoogleAudioEncoding(format) {
    const encodingMap = {
      'webm': 'WEBM_OPUS',
      'wav': 'LINEAR16',
      'mp3': 'MP3',
      'ogg': 'OGG_OPUS',
      'mpeg': 'MP3'
    };
    return encodingMap[format] || 'LINEAR16';
  }

  /**
   * Helper: Delay function for polling
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new NeuralTranscriptionService();
