// Test transcription service
const fs = require('fs');
const path = require('path');
const freeNeuralTranscriptionService = require('./server/services/freeNeuralTranscription');

async function testTranscription() {
  console.log('🎤 Testing transcription service...');
  
  // Check available providers
  const providers = freeNeuralTranscriptionService.getAvailableProviders();
  console.log('Available providers:', providers.map(p => p.name));
  
  // Create a simple test audio buffer (silence)
  const testBuffer = Buffer.alloc(16000 * 2); // 2 seconds of 16kHz audio (silence)
  
  try {
    console.log('Testing with silence...');
    const result = await freeNeuralTranscriptionService.transcribeAudio(testBuffer, 'wav', 'en');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test with a small audio file if available
  const testAudioPath = path.join(__dirname, 'test_audio.wav');
  if (fs.existsSync(testAudioPath)) {
    try {
      console.log('Testing with audio file...');
      const audioBuffer = fs.readFileSync(testAudioPath);
      const result = await freeNeuralTranscriptionService.transcribeAudio(audioBuffer, 'wav', 'en');
      console.log('Result:', result);
    } catch (error) {
      console.error('Error:', error.message);
    }
  } else {
    console.log('No test audio file found at', testAudioPath);
  }
}

testTranscription().catch(console.error);