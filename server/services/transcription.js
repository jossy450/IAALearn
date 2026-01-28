const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

let openai = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

class TranscriptionService {
  async transcribeAudio(audioBuffer, format = 'webm') {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    let tempFilePath = null;
    
    try {
      const startTime = Date.now();
      
      // Create a temporary file from buffer (OpenAI SDK requires file path or stream)
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `audio-${Date.now()}.${format}`);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      // Create a readable stream from the file
      const audioStream = fs.createReadStream(tempFilePath);

      const transcription = await client.audio.transcriptions.create({
        file: audioStream,
        model: 'whisper-1',
        language: 'en',
        response_format: 'json'
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        text: transcription.text,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Transcription error:', error);
      
      // Provide more detailed error messages
      if (error.message?.includes('API key')) {
        throw new Error('OpenAI API key is invalid or missing');
      } else if (error.message?.includes('audio')) {
        throw new Error('Invalid audio format or corrupted audio file');
      } else {
        throw new Error(`Transcription failed: ${error.message}`);
      }
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to delete temporary file:', cleanupError);
        }
      }
    }
  }

  async transcribeStream(audioStream) {
    // For real-time transcription, we would implement streaming
    // This is a placeholder for future implementation
    throw new Error('Streaming transcription not yet implemented');
  }
}

module.exports = new TranscriptionService();
