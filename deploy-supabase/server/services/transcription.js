const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class TranscriptionService {
  async transcribeAudio(audioBuffer, format = 'webm') {
    try {
      const startTime = Date.now();
      
      // Create a File object from buffer
      const file = new File([audioBuffer], `audio.${format}`, {
        type: `audio/${format}`
      });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
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
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async transcribeStream(audioStream) {
    // For real-time transcription, we would implement streaming
    // This is a placeholder for future implementation
    throw new Error('Streaming transcription not yet implemented');
  }
}

module.exports = new TranscriptionService();
