// Test transcription service with proper environment loading
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const fs = require('fs');
const freeNeuralTranscriptionService = require('./server/services/freeNeuralTranscription');

async function testTranscription() {
  console.log('🎤 Testing transcription service...');
  console.log('Environment check:');
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'NOT SET');
  console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '***' + process.env.GROQ_API_KEY.slice(-4) : 'NOT SET');
  
  // Check available providers
  const providers = freeNeuralTranscriptionService.getAvailableProviders();
  console.log('Available providers:', providers.map(p => p.name));
  
  // Create a simple test audio buffer (silence)
  const testBuffer = Buffer.alloc(16000 * 2); // 2 seconds of 16kHz audio (silence)
  
  try {
    console.log('\nTesting with silence...');
    const result = await freeNeuralTranscriptionService.transcribeAudio(testBuffer, 'wav', 'en');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test with a small audio file if available
  const testAudioPath = path.join(__dirname, 'test_audio.wav');
  if (fs.existsSync(testAudioPath)) {
    try {
      console.log('\nTesting with audio file...');
      const audioBuffer = fs.readFileSync(testAudioPath);
      const result = await freeNeuralTranscriptionService.transcribeAudio(audioBuffer, 'wav', 'en');
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
  } else {
    console.log('\nNo test audio file found at', testAudioPath);
    console.log('Creating a simple test recording...');
    
    // Create a simple sine wave audio for testing
    const sampleRate = 16000;
    const duration = 2; // seconds
    const frequency = 440; // Hz (A4 note)
    const buffer = Buffer.alloc(sampleRate * duration * 2); // 16-bit PCM
    
    for (let i = 0; i < sampleRate * duration; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
      buffer.writeInt16LE(sample, i * 2);
    }
    
    try {
      console.log('Testing with generated audio tone...');
      const result = await freeNeuralTranscriptionService.transcribeAudio(buffer, 'wav', 'en');
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testTranscription().catch(console.error);