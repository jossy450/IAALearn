import { Capacitor } from '@capacitor/core';

let mediaRecorderInstance = null;
let audioChunks = [];
let currentMimeType = 'audio/webm';
let currentStream = null;

export async function startNativeRecording(options = {}) {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    console.log('Native recording not available on web');
    return { filePath: null };
  }

  try {
    console.log('🎤 Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      } 
    });
    currentStream = stream;
    
    // Determine best supported format
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    
    currentMimeType = 'audio/webm';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        currentMimeType = mimeType;
        break;
      }
    }
    console.log('🎤 Using MIME type:', currentMimeType);
    
    audioChunks = [];
    mediaRecorderInstance = new MediaRecorder(stream, { mimeType: currentMimeType });
    
    mediaRecorderInstance.ondataavailable = (event) => {
      console.log('📦 Data available:', event.data.size, 'bytes');
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorderInstance.start(1000); // Collect data every second
    console.log('🎤 Recording started with MediaRecorder');
    
    return { started: true, mimeType: currentMimeType };
  } catch (error) {
    console.error('❌ Failed to start recording:', error);
    throw error;
  }
}

export async function stopNativeRecording(options = {}) {
  return new Promise((resolve, reject) => {
    console.log('🛑 stopNativeRecording called');
    console.log('   mediaRecorderInstance:', !!mediaRecorderInstance);
    console.log('   state:', mediaRecorderInstance?.state);
    
    if (!mediaRecorderInstance || mediaRecorderInstance.state === 'inactive') {
      console.log('🛑 MediaRecorder not active or already stopped');
      resolve({ filePath: null, webPath: null });
      return;
    }
    
    console.log('🛑 Stopping recording, current chunks:', audioChunks.length);
    
    // Store reference to the recorder
    const recorder = mediaRecorderInstance;
    
    // Handle onstop event - use arrow function to preserve 'this'
    recorder.onstop = () => {
      console.log('📁 Recording stopped, chunks:', audioChunks.length);
      
      // Stop all tracks
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }
      
      if (audioChunks.length === 0) {
        console.error('❌ No audio chunks recorded');
        reject(new Error('No audio recorded - please speak for at least 2-3 seconds'));
        return;
      }
      
      const mimeType = currentMimeType || 'audio/webm';
      const blob = new Blob(audioChunks, { type: mimeType });
      
      console.log('✅ Recording complete - size:', blob.size, 'bytes, type:', mimeType);
      
      // Clean up
      audioChunks = [];
      mediaRecorderInstance = null;
      
      if (blob.size < 1000) {
        console.warn('⚠️ Recording very small:', blob.size, 'bytes');
        reject(new Error('Recording too short - please speak for at least 2-3 seconds'));
        return;
      }
      
      resolve({
        blob: blob,
        mimeType: mimeType,
        duration: null
      });
    };
    
    // Handle errors
    recorder.onerror = (event) => {
      console.error('❌ MediaRecorder error:', event.error);
      audioChunks = [];
      mediaRecorderInstance = null;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }
      reject(new Error(event.error || 'Recording error'));
    };
    
    // Request final chunk and stop
    try {
      recorder.requestData();
      setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch (stopErr) {
          console.error('❌ Error stopping recorder:', stopErr);
          reject(stopErr);
        }
      }, 100);
    } catch (err) {
      console.error('❌ Error requesting data:', err);
      reject(err);
    }
  });
}
