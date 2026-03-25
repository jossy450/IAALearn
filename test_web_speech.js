// Test Web Speech API availability
console.log('Testing Web Speech API availability...');

// Check if Web Speech API is available
const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (WebSpeechRecognition) {
  console.log('✅ Web Speech API is available');
  console.log('SpeechRecognition:', WebSpeechRecognition);
  
  // Test creating a recognition instance
  try {
    const recognition = new WebSpeechRecognition();
    console.log('✅ SpeechRecognition instance created successfully');
    console.log('Recognition properties:');
    console.log('  - continuous:', recognition.continuous);
    console.log('  - interimResults:', recognition.interimResults);
    console.log('  - lang:', recognition.lang);
    console.log('  - maxAlternatives:', recognition.maxAlternatives);
  } catch (error) {
    console.error('❌ Failed to create SpeechRecognition instance:', error);
  }
} else {
  console.log('❌ Web Speech API is NOT available');
  console.log('window.SpeechRecognition:', window.SpeechRecognition);
  console.log('window.webkitSpeechRecognition:', window.webkitSpeechRecognition);
}

// Check if MediaRecorder is available
if (window.MediaRecorder) {
  console.log('✅ MediaRecorder is available');
  
  // Check supported MIME types
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];
  
  console.log('Supported MIME types:');
  mimeTypes.forEach(mimeType => {
    const isSupported = MediaRecorder.isTypeSupported(mimeType);
    console.log(`  ${mimeType}: ${isSupported ? '✅' : '❌'}`);
  });
} else {
  console.log('❌ MediaRecorder is NOT available');
}

// Check if getUserMedia is available
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  console.log('✅ getUserMedia is available');
} else {
  console.log('❌ getUserMedia is NOT available');
}

console.log('\nPlatform check:');
console.log('  User Agent:', navigator.userAgent);
console.log('  Platform:', navigator.platform);
console.log('  Language:', navigator.language);