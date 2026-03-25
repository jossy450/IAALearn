// Speech Recognition Debug Utility
// For testing on Samsung Galaxy S24 Ultra

export class SpeechDebug {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(message, data = null) {
    const timestamp = Date.now() - this.startTime;
    const entry = {
      timestamp,
      time: new Date().toISOString(),
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    
    this.logs.push(entry);
    console.log(`[${timestamp}ms] ${message}`, data || '');
    
    // Also send to server for remote debugging
    this.sendToServer(entry);
    
    return entry;
  }

  async sendToServer(entry) {
    try {
      // Send debug info to server for remote monitoring
      const response = await fetch('/api/debug/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
          deviceMemory: navigator.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency
        })
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to send debug log:', error);
      return false;
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.startTime = Date.now();
  }

  async testCapacitorSpeechRecognition() {
    const debug = this;
    debug.log('Starting Capacitor Speech Recognition test');
    
    try {
      // Try to load Capacitor Speech Recognition
      debug.log('Loading Capacitor Speech Recognition plugin...');
      const CapacitorSpeechRecognition = await import('@capacitor-community/speech-recognition');
      const speechRecognition = CapacitorSpeechRecognition.SpeechRecognition;
      
      debug.log('Plugin loaded:', !!speechRecognition);
      
      // Check permissions
      debug.log('Checking permissions...');
      const hasPermission = await speechRecognition.hasPermission();
      debug.log('Permission status:', hasPermission);
      
      if (!hasPermission.permission) {
        debug.log('Requesting permission...');
        const requestResult = await speechRecognition.requestPermission();
        debug.log('Permission request result:', requestResult);
        
        if (!requestResult.permission) {
          debug.log('Permission denied');
          return { success: false, error: 'Permission denied' };
        }
      }
      
      // Test speech recognition
      debug.log('Starting speech recognition test...');
      await speechRecognition.start({
        language: 'en-US',
        maxResults: 5,
        prompt: 'Test speech recognition',
        partialResults: true,
        popup: false
      });
      
      debug.log('Speech recognition started');
      
      // Set up listeners
      speechRecognition.addListener('partialResults', (data) => {
        debug.log('Partial results:', data);
      });
      
      speechRecognition.addListener('results', (data) => {
        debug.log('Final results:', data);
      });
      
      speechRecognition.addListener('error', (error) => {
        debug.log('Speech recognition error:', error);
      });
      
      // Stop after 10 seconds
      setTimeout(async () => {
        debug.log('Stopping speech recognition test...');
        await speechRecognition.stop();
        debug.log('Test completed');
      }, 10000);
      
      return { success: true };
      
    } catch (error) {
      debug.log('Capacitor Speech Recognition test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async testWebSpeechAPI() {
    const debug = this;
    debug.log('Starting Web Speech API test');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      debug.log('Web Speech API not available');
      return { success: false, error: 'Web Speech API not available' };
    }
    
    debug.log('Web Speech API available');
    
    return new Promise((resolve) => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        debug.log('Web Speech API started');
      };
      
      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        debug.log('Web Speech API result:', { final, interim });
      };
      
      recognition.onerror = (event) => {
        debug.log('Web Speech API error:', event.error);
        resolve({ success: false, error: event.error });
      };
      
      recognition.onend = () => {
        debug.log('Web Speech API ended');
        resolve({ success: true });
      };
      
      try {
        recognition.start();
        debug.log('Web Speech API recognition started');
        
        // Stop after 10 seconds
        setTimeout(() => {
          recognition.stop();
        }, 10000);
      } catch (error) {
        debug.log('Failed to start Web Speech API:', error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  async testMediaRecorder() {
    const debug = this;
    debug.log('Starting MediaRecorder test');
    
    try {
      debug.log('Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      debug.log('Microphone access granted');
      debug.log('Audio tracks:', stream.getAudioTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })));
      
      // Test recording
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      let mimeType = 'audio/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          mimeType = m;
          break;
        }
      }
      
      debug.log('Using MIME type:', mimeType);
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          debug.log('MediaRecorder data chunk:', { size: event.data.size });
        }
      };
      
      recorder.onstop = () => {
        debug.log('MediaRecorder stopped, total chunks:', chunks.length);
        const blob = new Blob(chunks, { type: mimeType });
        debug.log('Total recording size:', blob.size, 'bytes');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        debug.log('MediaRecorder test completed');
      };
      
      recorder.onerror = (event) => {
        debug.log('MediaRecorder error:', event.error);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      debug.log('MediaRecorder started');
      
      // Record for 5 seconds
      setTimeout(() => {
        recorder.stop();
      }, 5000);
      
      return { success: true };
      
    } catch (error) {
      debug.log('MediaRecorder test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    const debug = this;
    debug.log('=== Starting all speech recognition tests ===');
    
    const results = {
      capacitor: null,
      webSpeech: null,
      mediaRecorder: null
    };
    
    // Test Capacitor Speech Recognition
    debug.log('\n--- Testing Capacitor Speech Recognition ---');
    results.capacitor = await this.testCapacitorSpeechRecognition();
    
    // Test Web Speech API
    debug.log('\n--- Testing Web Speech API ---');
    results.webSpeech = await this.testWebSpeechAPI();
    
    // Test MediaRecorder
    debug.log('\n--- Testing MediaRecorder ---');
    results.mediaRecorder = await this.testMediaRecorder();
    
    debug.log('\n=== All tests completed ===');
    debug.log('Results:', results);
    
    return results;
  }
}

// Export singleton instance
export const speechDebug = new SpeechDebug();