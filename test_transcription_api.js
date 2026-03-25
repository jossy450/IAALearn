// Test transcription API endpoint
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function testTranscriptionAPI() {
  console.log('🎤 Testing transcription API endpoint...');
  
  // Create a simple test audio file (silence)
  const sampleRate = 16000;
  const duration = 2; // seconds
  const buffer = Buffer.alloc(sampleRate * duration * 2); // 16-bit PCM
  
  // Fill with a simple sine wave
  const frequency = 440; // Hz (A4 note)
  for (let i = 0; i < sampleRate * duration; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
    buffer.writeInt16LE(sample, i * 2);
  }
  
  // Save as WAV file
  const wavHeader = Buffer.alloc(44);
  // RIFF header
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + buffer.length, 4); // file size - 8
  wavHeader.write('WAVE', 8);
  // fmt subchunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // PCM
  wavHeader.writeUInt16LE(1, 20); // audio format (PCM)
  wavHeader.writeUInt16LE(1, 22); // mono
  wavHeader.writeUInt32LE(sampleRate, 24); // sample rate
  wavHeader.writeUInt32LE(sampleRate * 2, 28); // byte rate
  wavHeader.writeUInt16LE(2, 32); // block align
  wavHeader.writeUInt16LE(16, 34); // bits per sample
  // data subchunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(buffer.length, 40);
  
  const wavBuffer = Buffer.concat([wavHeader, buffer]);
  const tempFilePath = path.join(__dirname, 'test_audio.wav');
  fs.writeFileSync(tempFilePath, wavBuffer);
  
  console.log(`✅ Created test audio file: ${tempFilePath} (${wavBuffer.length} bytes)`);
  
  try {
    // Create form data
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(tempFilePath), {
      filename: 'test_audio.wav',
      contentType: 'audio/wav'
    });
    formData.append('format', 'wav');
    formData.append('language', 'en');
    
    // Make API request
    const response = await axios.post('http://localhost:3001/api/transcription/transcribe', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer test-token' // Add auth token if needed
      },
      timeout: 30000
    });
    
    console.log('✅ Transcription API response:');
    console.log('  Status:', response.status);
    console.log('  Provider:', response.data.provider);
    console.log('  Text:', response.data.text);
    console.log('  Duration:', response.data.duration, 'ms');
    console.log('  Success:', response.data.success);
    
  } catch (error) {
    console.error('❌ Transcription API error:');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('  Message:', error.message);
    }
  } finally {
    // Clean up
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

testTranscriptionAPI().catch(console.error);