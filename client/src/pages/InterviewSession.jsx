import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Copy, QrCode, MonitorUp, Loader, Square } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { sessionAPI, transcriptionAPI, getApiRoot } from '../services/api';
import { startNativeRecording, stopNativeRecording } from '../services/nativeAudioRecorder';
import QRTransferModal from '../components/QRTransferModal';
import FloatingAnswer from '../components/FloatingAnswer';
import ScreenShareDetector from '../components/ScreenShareDetector';
import useStealthStore from '../store/stealthStore';
import { trackSessionStart, trackEvent } from '../services/firebaseAnalytics';
import { ConversationTracker, processContinuousSpeech } from '../services/intelligentQuestionDetector';
import './InterviewSession.css';

// Capacitor Speech Recognition - loaded lazily
let CapacitorSpeechRecognition = null;
let CapacitorSpeechRecognitionPlugin = null;

const loadCapacitorSpeechRecognition = async () => {
  if (CapacitorSpeechRecognitionPlugin) return CapacitorSpeechRecognitionPlugin;
  try {
    console.log('🔊 Loading Capacitor Speech Recognition plugin...');
    CapacitorSpeechRecognition = await import('@capacitor-community/speech-recognition');
    CapacitorSpeechRecognitionPlugin = CapacitorSpeechRecognition.SpeechRecognition;
    console.log('🔊 Capacitor Speech Recognition loaded:', !!CapacitorSpeechRecognitionPlugin);
    return CapacitorSpeechRecognitionPlugin;
  } catch (e) {
    console.error('🔊 Capacitor Speech Recognition load failed:', e.message);
    return null;
  }
};

function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedQuestion, setRecordedQuestion] = useState(''); // Transcribed interviewer's question
  const [perfectAnswer, setPerfectAnswer] = useState(''); // AI-generated perfect answer
  const [questionHistory, setQuestionHistory] = useState([]); // History of questions and answers
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(null); // 'recording' | 'transcribing' | 'analyzing' | null
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [isScreenShareDetected, setIsScreenShareDetected] = useState(false); // Mobile mode requirement
  const [showQRTransfer, setShowQRTransfer] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [autoListen, setAutoListen] = useState(true); // default ON — live auto-transcribe like a real conversation
  const [isAnswerHidden, setIsAnswerHidden] = useState(false); // default reveal; user can hide
  const [showFloatingAnswer, setShowFloatingAnswer] = useState(false); // floating answer visibility
  const [liveTranscript, setLiveTranscript] = useState(''); // real-time interim transcript shown while listening
  const [isAutoListening, setIsAutoListening] = useState(false); // auto-listen mode currently active
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const debounceTimerRef = useRef(null);
  const recordingMimeTypeRef = useRef('audio/webm');
  const conversationEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const autoListenRecognitionRef = useRef(null); // dedicated ref for auto-listen continuous recognition
  const finalTranscriptRef = useRef(''); // accumulates confirmed final transcript segments
  const manualSpeechRecognitionRef = useRef(null); // live preview during manual MediaRecorder recording
  const silenceTimerRef = useRef(null);       // fires when speech pauses long enough to submit
  const isProcessingRef = useRef(false);      // true while AI is generating an answer
  const pendingWhileProcessingRef = useRef(''); // speech captured while AI was busy
  const mediaStreamRef = useRef(null);         // for auto-listen MediaRecorder
  const autoListenRecorderRef = useRef(null);  // MediaRecorder instance
  const autoListenChunksRef = useRef([]);      // audio chunks
  const autoListenSilenceTimerRef = useRef(null); // silence detection timer
  const isListeningRef = useRef(false);        // is auto-listen active
  const SILENCE_DELAY = 2500;                 // ms of silence before auto-submitting question
  const { setScreenRecording, stealthMode } = useStealthStore();
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const conversationTrackerRef = useRef(new ConversationTracker());

  const parseSSEChunk = (chunkText = '') => {
    // Handle text/event-stream payloads like:
    // data: {"type":"chunk","content":"..."}\n\n
    // or plain text payloads
    const parts = chunkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'));

    if (parts.length === 0) {
      return chunkText;
    }

    let extracted = '';
    for (const line of parts) {
      const payload = line.replace(/^data:\s*/, '');
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.type === 'chunk' && typeof parsed.content === 'string') {
          extracted += parsed.content;
        }
      } catch {
        // Not JSON -> treat as raw text data frame
        extracted += payload;
      }
    }

    return extracted;
  };

  // Auto-scroll to latest message
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionQuestions]);

  // Check microphone permission on load
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        console.log('📱 Running on platform:', Capacitor.getPlatform());
        
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          // On Android, check Capacitor Speech Recognition permission
          const speechRecognition = await loadCapacitorSpeechRecognition();
          if (speechRecognition) {
            const hasPermission = await speechRecognition.hasPermission();
            console.log('🔊 Android speech recognition permission:', hasPermission);
            setHasMicrophonePermission(hasPermission.permission);
          }
        } else {
          // On web, check if we can access microphone
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
              // Try to get a stream to check permission
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach(track => track.stop());
              setHasMicrophonePermission(true);
              console.log('✅ Web microphone permission granted');
            } catch (error) {
              console.log('❌ Web microphone permission not granted:', error.message);
              setHasMicrophonePermission(false);
            }
          }
        }
      } catch (error) {
        console.warn('Permission check failed:', error);
      }
    };
     
    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    loadSession();
  }, [id]);

  // ─── Auto-listen: start/stop continuous speech recognition ───
  useEffect(() => {
    // Small delay to ensure functions are defined
    const timer = setTimeout(() => {
      // Use same Web Speech API for both web and Android
      if (autoListen) {
        startAutoListen();
      } else {
        stopAutoListen();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [autoListen, session, isAutoListening, loading]);


  // ─── startAutoListen: Web Speech API for web, Android-specific for Android ───
  const startAutoListen = async () => {
    console.log('🎤 startAutoListen called');
    console.log('   Platform:', Capacitor.getPlatform());
    console.log('   Is Native:', Capacitor.isNativePlatform());
    
    // Clean up any existing session
    if (autoListenRecognitionRef.current) {
      try { autoListenRecognitionRef.current.stop(); } catch (_) {}
      autoListenRecognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (autoListenRecorderRef.current) {
      try { autoListenRecorderRef.current.stop(); } catch (_) {}
      autoListenRecorderRef.current = null;
    }

    finalTranscriptRef.current = '';
    pendingWhileProcessingRef.current = '';
    isProcessingRef.current = false;
    setLiveTranscript('');

    // Check if AI is processing - don't start if already processing
    if (isProcessingRef.current) {
      console.log('   AI is processing, skipping...');
      return;
    }

    // On Android native, use the Android-specific function
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      console.log('🎤 Using Android speech recognition...');
      await startAndroidSpeechRecognition();
      return;
    }

    // Use Web Speech API for web browsers
    const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (WebSpeechRecognition) {
      console.log('🎤 Using Web Speech API for auto-listen');
      startWebSpeechAutoListen(WebSpeechRecognition);
      return;
    }

    // Fallback for other platforms - use MediaRecorder
    console.log('🎤 Using MediaRecorder fallback');
    await startMediaRecorderAutoListen();
  };

  // Web Speech API auto-listen for web browsers
  const startWebSpeechAutoListen = (WebSpeechRecognition) => {
    const recognition = new WebSpeechRecognition();
    autoListenRecognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Web Speech API started');
      setIsAutoListening(true);
      setIsRecording(true);
      setLoadingStep('recording');
      setLiveTranscript('🎤 Listening... Ask your interview question');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let gotFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + ' ';
          gotFinal = true;
        } else {
          interim += t;
        }
      }

      const combined = finalTranscriptRef.current + interim;

      if (isProcessingRef.current) {
        pendingWhileProcessingRef.current = combined;
        setLiveTranscript('🎧 ' + combined);
        return;
      }

      setLiveTranscript(combined);

      // Silence detection - submit after 2.5 seconds of no new speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const question = finalTranscriptRef.current.trim();
        if (question && !isProcessingRef.current && question.split(/\s+/).length >= 3) {
          console.log('🔇 Silence detected - auto-submitting:', question);
          autoSubmitQuestion(question);
        }
      }, SILENCE_DELAY);
    };

    recognition.onerror = (event) => {
      console.warn('Web Speech error:', event.error);
      if (event.error === 'no-speech') return;
      if (event.error === 'network') {
        showToast('⚠️ Network issue with speech recognition', 'warning');
      }
    };

    recognition.onend = () => {
      console.log('🎤 Web Speech ended');
      if (autoListenRecognitionRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (_) {}
        }, 150);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start Web Speech:', err);
      showToast('❌ Speech recognition failed', 'error');
      setAutoListen(false);
    }
  };

  // MediaRecorder fallback for Android
  const startMediaRecorderAutoListen = async () => {
    console.log('🎤 startMediaRecorderAutoListen - starting...');
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not available');
        showToast('❌ Audio input not supported', 'error');
        setAutoListen(false);
        return;
      }
      
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      console.log('✅ Microphone permission granted');
      
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      let mimeType = 'audio/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          mimeType = m;
          console.log('   Using MIME:', mimeType);
          break;
        }
      }
      
      mediaStreamRef.current = stream;
      autoListenChunksRef.current = [];
      isListeningRef.current = true;
      
      const recorder = new MediaRecorder(stream, { mimeType });
      autoListenRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          autoListenChunksRef.current.push(event.data);
        }
      };
      
      recorder.onerror = (e) => {
        console.error('❌ Recorder error:', e.error);
      };
      
      recorder.start(1000);
      console.log('✅ MediaRecorder started');
      
      setIsAutoListening(true);
      setIsRecording(true);
      setLoadingStep('recording');
      setLiveTranscript('🎤 Listening... Ask your interview question');
      showToast('Listening... Ask your interview question', 'success');
      
      // Process audio every 2 seconds
      const processInterval = setInterval(async () => {
        if (!isListeningRef.current) {
          clearInterval(processInterval);
          return;
        }
        
        const chunks = autoListenChunksRef.current;
        if (chunks.length === 0) {
          console.log('   No audio chunks yet...');
          return;
        }
        
        const blob = new Blob(chunks, { type: mimeType });
        console.log('   Processing blob:', blob.size, 'bytes');
        autoListenChunksRef.current = [];
        
        if (blob.size < 1000) {
          console.log('   Audio too small, skipping...');
          return;
        }
        
        setLoadingStep('transcribing');
        
        try {
          const format = mimeType.includes('ogg') ? 'ogg' : 'webm';
          const formData = new FormData();
          formData.append('audio', blob, `question.${format}`);
          formData.append('format', format);
          
          const token = getAuthToken();
          const apiBase = (getApiRoot() || '').replace(/\/$/, '');
          const url = `${apiBase}/api/transcription/transcribe`;
          
          console.log('   Transcribing...');
          
          const response = await fetch(url, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
          });
          
          if (!response.ok) {
            console.error('   Server error:', response.status);
            throw new Error(`Server error: ${response.status}`);
          }
          
          const data = await response.json();
          const text = (data.text || '').trim();
          
          console.log('   Transcription:', text);
          setLoadingStep('recording');
          
          if (text && text.length > 0) {
            finalTranscriptRef.current += text + ' ';
            const combined = finalTranscriptRef.current.trim();
            setLiveTranscript(combined);
            
            if (isQuestion(text)) {
              console.log('   ✅ Question detected!');
              if (!isProcessingRef.current && combined.split(/\s+/).length >= 3) {
                autoSubmitQuestion(combined);
              }
            }
          }
        } catch (e) {
          console.error('   Transcription error:', e);
          setLoadingStep('recording');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ MediaRecorder auto-listen failed:', error);
      showToast('❌ Auto-listen failed: ' + error.message, 'error');
      setAutoListen(false);
    }
  };
  
  // Process auto-listen audio chunks
  const processAutoListenChunk = async () => {
    if (isProcessingRef.current || autoListenChunksRef.current.length === 0) {
      return;
    }
    
    // Get the latest chunk
    const chunk = autoListenChunksRef.current[autoListenChunksRef.current.length - 1];
    if (chunk.size < 100) {
      return; // Too small, probably silence
    }
    
    // Create blob from chunk
    const blob = new Blob([chunk], { type: 'audio/webm' });
    
    try {
      // Transcribe the chunk
      const transcribedText = await transcribeAudioChunk(blob);
      if (transcribedText && transcribedText.trim()) {
        const text = transcribedText.trim();
        console.log('🎤 Auto-listen transcribed:', text);
        
        // Update live transcript
        setLiveTranscript(text);
        finalTranscriptRef.current = text;
        
        // Start silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          // Silence detected - submit question
          if (text && !isProcessingRef.current) {
            console.log('🔇 Silence detected — auto-submitting question:', text);
            autoSubmitQuestion(text);
          }
        }, SILENCE_DELAY);
      }
    } catch (error) {
      console.warn('Auto-listen chunk transcription failed:', error);
    }
  };
  
  // Transcribe audio chunk using server API
  const transcribeAudioChunk = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'chunk.webm');
      formData.append('format', 'webm');

      const token = getAuthToken();
      const apiBase = (getApiRoot() || '').replace(/\/$/, '');
      const url = `${apiBase}/api/transcription/transcribe`;
      
      const fetchOptions = {
        method: 'POST',
        body: formData,
      };
      
      if (token) {
        fetchOptions.headers = {
          'Authorization': `Bearer ${token}`,
        };
      }
      
      const fetchResponse = await fetch(url, fetchOptions);
      
      if (!fetchResponse.ok) {
        throw new Error(`Server error: ${fetchResponse.status}`);
      }
      
      const data = await fetchResponse.json();
      
      if (data.text && !data.text.startsWith('[')) {
        return data.text;
      }
      
      return '';
    } catch (error) {
      console.error('Transcription failed:', error);
      return '';
    }
  };

  // ─── autoSubmitQuestion: called when silence detected — submit to AI, keep listening ───
  const autoSubmitQuestion = (question) => {
    if (!question.trim() || isProcessingRef.current) return;

    // Use intelligent question detection to filter out side talk
    const detection = processContinuousSpeech(question, conversationTrackerRef.current);
    
    console.log('🤖 Question detection result:', {
      text: question,
      isQuestion: detection.isQuestion,
      confidence: detection.confidence,
      reason: detection.reason,
      shouldRespond: detection.shouldRespond
    });

    // Only submit if it's likely a question with sufficient confidence
    if (!detection.shouldRespond) {
      console.log('🤖 Skipping - not a clear question:', detection.reason);
      
      // Show feedback to user about why it was skipped
      if (detection.confidence > 20 && detection.confidence < 50) {
        showToast(`💬 Heard: "${question.substring(0, 50)}..." (Not a clear question - ${detection.reason})`, 'info');
      }
      
      // Reset for next listening cycle
      finalTranscriptRef.current = '';
      setLiveTranscript('');
      return;
    }

    console.log('🤖 Auto-submitting question to AI:', question);
    isProcessingRef.current = true;
    pendingWhileProcessingRef.current = '';

    // Reset transcript for next question (keep listening)
    finalTranscriptRef.current = '';
    setLiveTranscript('');
    setRecordedQuestion(question);

    // Run AI analysis — do NOT stop listening
    autoAnalyzeQuestion(question);
  };

  // ─── autoAnalyzeQuestion: like analyzQuestion but keeps auto-listen running ───
  const autoAnalyzeQuestion = async (question) => {
    const startTime = Date.now();
    setLoading(true);
    setLoadingStep('analyzing');
    setIsStreaming(true);
    setPerfectAnswer('');
    setResponseTime(null);

    try {
      const token = getAuthToken();
      const apiRoot = getApiRoot();
      const base = (apiRoot || window.location.origin || '').replace(/\/$/, '');
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';

      const contextData = {
        interviewerQuestion: question,
        position: session?.position,
        company: session?.company_name,
        sessionType: session?.session_type || 'general',
        cv: session?.cv_content || '',
        jobDescription: session?.job_description || '',
        personSpecification: session?.person_specification || '',
        aiInstructions: session?.metadata?.aiInstructions || '',
      };

      const response = await fetch(
        `${base}/api/smart-ai/get-perfect-answer${tokenQuery}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contextData),
        }
      );

      if (!response.ok) throw new Error('Failed to generate perfect answer');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullAnswer += parseSSEChunk(chunk);
        setPerfectAnswer(fullAnswer);
        if (stealthMode && !showFloatingAnswer) setShowFloatingAnswer(true);
      }

      fullAnswer = fullAnswer.trim();
      if (!fullAnswer) throw new Error('Empty AI response');

      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      showToast('✅ Answer ready — still listening…', 'success');

      setQuestionHistory(prev => [...prev, {
        question,
        perfectAnswer: fullAnswer,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Auto-analyze error:', error);
      showToast(error?.message || 'Error generating answer.', 'error');
    } finally {
      setLoading(false);
      setLoadingStep(null);
      setIsStreaming(false);
      isProcessingRef.current = false;

      // If new speech was captured while AI was processing, treat it as next question
      const pending = pendingWhileProcessingRef.current.trim();
      pendingWhileProcessingRef.current = '';
      if (pending && pending.split(/\s+/).length >= 3) {
        console.log('📥 Processing buffered speech as next question:', pending);
        // Show it as live transcript and arm silence timer
        finalTranscriptRef.current = pending + ' ';
        setLiveTranscript(pending);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const q = finalTranscriptRef.current.trim();
          if (q && !isProcessingRef.current) autoSubmitQuestion(q);
        }, SILENCE_DELAY);
      } else {
        // Ready for next question
        setLiveTranscript('');
        setRecordedQuestion('');
      }
    }
  };

  // ─── stopAutoListen: fully stops auto-listen mode ───
  const stopAutoListen = () => {
    console.log('🛑 stopAutoListen called');
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Stop Web Speech API recognition if running
    if (autoListenRecognitionRef.current) {
      try {
        autoListenRecognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping Web Speech recognition:', error);
      }
      autoListenRecognitionRef.current = null;
    }
    
    // Stop MediaRecorder if running
    if (autoListenRecorderRef.current && autoListenRecorderRef.current.state !== 'inactive') {
      try {
        autoListenRecorderRef.current.stop();
      } catch (error) {
        console.warn('Error stopping MediaRecorder:', error);
      }
    }
    
    // Clean up stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    autoListenRecorderRef.current = null;
    autoListenChunksRef.current = [];
    isProcessingRef.current = false;
    pendingWhileProcessingRef.current = '';
    finalTranscriptRef.current = '';
    setIsAutoListening(false);
    // Only set isRecording to false if we're not in manual recording mode
    if (!isRecording) {
      setIsRecording(false);
    }
    setLoadingStep(null);
    setLiveTranscript('');
  };

  // Helper to detect if text is a question
  const isQuestion = (text) => {
    if (!text || text.length < 5) return false;
    const trimmed = text.trim().toLowerCase();
    if (trimmed.endsWith('?')) return true;
    const questionStarters = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can you', 'could you', 'would you', 'tell me', 'explain', 'describe', 'give me', 'show me', 'have you', 'are you', 'do you', 'if you'];
    if (questionStarters.some(starter => trimmed.startsWith(starter))) return true;
    return false;
  };

  const startAndroidSpeechRecognition = async () => {
    console.log('🎤 startAndroidSpeechRecognition - auto-listen');
    
    if (isProcessingRef.current) {
      console.log('   AI is processing, skipping...');
      return;
    }
    
    // Clean up
    finalTranscriptRef.current = '';
    isListeningRef.current = true;
    
    // Try Capacitor Speech Recognition first
    try {
      console.log('   Trying Capacitor Speech Recognition...');
      const speechRecognition = await loadCapacitorSpeechRecognition();
      
      if (speechRecognition) {
        const hasPermission = await speechRecognition.hasPermission();
        
        if (!hasPermission.permission) {
          const requestResult = await speechRecognition.requestPermission();
          if (!requestResult.permission) {
            console.log('   Permission denied, using MediaRecorder');
            await startMediaRecorderAutoListen();
            return;
          }
        }
        
        // Use Capacitor Speech Recognition
        await speechRecognition.start({
          language: 'en-US',
          maxResults: 5,
          prompt: 'Ask your interview question',
          partialResults: true,
          popup: false
        });
        
        console.log('✅ Capacitor Speech Recognition started');
        
        speechRecognition.addListener('partialResults', (data) => {
          if (!isListeningRef.current) return;
          const matches = data.matches || [];
          if (matches.length > 0) {
            const partialText = matches[0];
            console.log('   Partial:', partialText);
            setLiveTranscript(partialText);
            
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              const currentText = partialText.trim();
              if (currentText.split(/\s+/).length >= 3 && !isProcessingRef.current) {
                console.log('   🔇 Submitting:', currentText);
                autoSubmitQuestion(currentText);
              }
            }, SILENCE_DELAY);
          }
        });
        
        speechRecognition.addListener('results', (data) => {
          if (!isListeningRef.current) return;
          const matches = data.matches || [];
          if (matches.length > 0) {
            const finalText = matches[0];
            console.log('   Final:', finalText);
            setLiveTranscript(finalText);
            if (finalText.split(/\s+/).length >= 3 && !isProcessingRef.current) {
              autoSubmitQuestion(finalText);
            }
          }
        });
        
        speechRecognition.addListener('error', (error) => {
          console.warn('   Speech error:', error);
        });
        
        setIsAutoListening(true);
        setIsRecording(true);
        setLoadingStep('recording');
        setLiveTranscript('🎤 Listening... Ask your interview question');
        showToast('Listening... Ask your interview question', 'success');
        return;
      }
    } catch (e) {
      console.log('   Capacitor SR failed:', e.message, '- using MediaRecorder');
    }
    
    // Fallback to MediaRecorder
    await startMediaRecorderAutoListen();
  };

  const stopAndroidSpeechRecognition = async () => {
    console.log('🛑 stopAndroidSpeechRecognition');
    
    isListeningRef.current = false;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Stop Capacitor Speech Recognition if available
    try {
      const speechRecognition = await loadCapacitorSpeechRecognition();
      if (speechRecognition) {
        await speechRecognition.stop();
        console.log('✅ Capacitor Speech Recognition stopped');
      }
    } catch (error) {
      console.warn('Error stopping Capacitor Speech Recognition:', error);
    }
    
    // Clean up old MediaRecorder references (for backward compatibility)
    if (autoListenRecorderRef.current && autoListenRecorderRef.current.state !== 'inactive') {
      try {
        autoListenRecorderRef.current.stop();
      } catch (e) {
        console.warn('   Error stopping old recorder:', e);
      }
    }
    autoListenRecorderRef.current = null;
    mediaRecorderRef.current = null;
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    autoListenChunksRef.current = [];
    
    setIsAutoListening(false);
    setIsRecording(false);
    setLoadingStep(null);
    setLiveTranscript('');
    
    console.log('✅ Auto-listen stopped');
  };

  // ─── startManualLivePreview: adds Web Speech live preview alongside MediaRecorder ───
  const startManualLivePreview = () => {
    const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!WebSpeechRecognition) return; // silently skip if not supported

    if (manualSpeechRecognitionRef.current) {
      try { manualSpeechRecognitionRef.current.stop(); } catch (_) {}
    }

    const recognition = new WebSpeechRecognition();
    manualSpeechRecognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t + ' ';
        } else {
          interim += t;
        }
      }
      setLiveTranscript(finalText + interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('Manual live preview error:', event.error);
    };

    recognition.onend = () => {
      // Restart if still recording
      if (manualSpeechRecognitionRef.current && isRecording) {
        try { recognition.start(); } catch (_) {}
      }
    };

    try { recognition.start(); } catch (_) {}
  };

  // ─── stopManualLivePreview: stops the live preview recognition ───
  const stopManualLivePreview = () => {
    if (!manualSpeechRecognitionRef.current) return;
    try { manualSpeechRecognitionRef.current.stop(); } catch (_) {}
    manualSpeechRecognitionRef.current = null;
    setLiveTranscript('');
  };

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  const requestMicrophonePermission = async () => {
    setIsRequestingPermission(true);
    try {
      console.log('🎤 Requesting microphone permission...');
      
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        // On Android, use Capacitor Speech Recognition permission request
        const speechRecognition = await loadCapacitorSpeechRecognition();
        if (speechRecognition) {
          const requestResult = await speechRecognition.requestPermission();
          console.log('🔊 Permission request result:', requestResult);
          
          if (requestResult.permission) {
            setHasMicrophonePermission(true);
            showToast('✅ Microphone permission granted!', 'success');
            
            // Auto-start listening if auto-listen is enabled
            if (autoListen) {
              setTimeout(() => startAndroidSpeechRecognition(), 500);
            }
          } else {
            showToast('❌ Microphone permission denied', 'error');
          }
        }
      } else {
        // On web, use getUserMedia to request permission
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setHasMicrophonePermission(true);
            showToast('✅ Microphone permission granted!', 'success');
            
            // Auto-start listening if auto-listen is enabled
            if (autoListen) {
              setTimeout(() => startAutoListen(), 500);
            }
          } catch (error) {
            console.error('❌ Permission request failed:', error);
            showToast('❌ Microphone permission denied', 'error');
          }
        }
      }
    } catch (error) {
      console.error('❌ Permission request error:', error);
      showToast('❌ Failed to request microphone permission', 'error');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const openAppSettings = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // On native Android, open app settings directly
        await App.openSettings();
      } else {
        // On web, show instructions
        showToast('Please check your browser microphone settings', 'error');
      }
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };

  const handleMobileRequired = () => {
    // Redirect to mobile interview session view
    navigate(`/mobile/${id}`);
  };

  const formatAnswer = useMemo(() => {
    const escapeHtml = (str = '') =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return (text = '') => {
      const safe = escapeHtml(text);
      // Convert **bold** to <strong> for emphasis
      return safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    };
  }, []);

  const loadSession = async () => {
    try {
      const response = await sessionAPI.getOne(id);
      setSession(response.data.session);
      setSessionQuestions(response.data.session.questions || []);
      trackSessionStart(response.data.session.type || 'practice');
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Session not found');
      navigate('/');
    }
  };

  const resolveFormatFromMime = (mimeType = '') => {
    const normalized = mimeType.split(';')[0].trim().toLowerCase();
    if (normalized.includes('audio/ogg')) return 'ogg';
    if (normalized.includes('audio/opus')) return 'opus';
    if (normalized.includes('audio/wav')) return 'wav';
    if (normalized.includes('audio/mpeg') || normalized.includes('audio/mp3')) return 'mp3';
    if (normalized.includes('audio/mp4') || normalized.includes('audio/x-m4a')) return 'mp4';
    return 'webm';
  };

  const startRecording = async () => {
    try {
      setRecordedQuestion('');
      setPerfectAnswer('');
      setLoadingStep('recording');
      
      console.log('🎤 Starting recording...');
      console.log('Platform:', Capacitor.getPlatform());
      console.log('Is native platform:', Capacitor.isNativePlatform());
      console.log('autoListen:', autoListen);
      
      trackEvent('recording_start', { session_id: id, platform: Capacitor.getPlatform() });

      // If auto-listen is enabled, use that instead of manual recording
      if (autoListen) {
        console.log('🎤 Auto-listen is ON, switching to auto-listen mode...');
        // Make sure auto-listen is properly started
        if (!isAutoListening) {
          await startAutoListen();
        }
        return;
      }
      
      // For manual recording or web, use MediaRecorder
      console.log('🎤 Using MediaRecorder for manual recording...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not available on this device');
        showToast('❌ Audio input not supported on this device.', 'error');
        setLoadingStep(null);
        setIsRecording(false);
        return;
      }
      
      // This will trigger the system permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      console.log('✅ Got audio stream');
      
      // Determine best format
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      let mimeType = 'audio/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          mimeType = m;
          break;
        }
      }
      console.log('🎤 Using format:', mimeType);
      
      // Create recorder
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recordingMimeTypeRef.current = mimeType;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        console.log('📦 Chunk:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('✅ Recording complete - size:', blob.size, 'bytes');
        
        stream.getTracks().forEach(track => track.stop());
        
        if (blob.size < 500) {
          showToast('❌ Recording too short. Speak for at least 2-3 seconds.', 'error');
          setLoadingStep(null);
          setIsRecording(false);
          return;
        }
        
        console.log('✅ Transcribing...');
        setLoadingStep('transcribing');
        const format = mimeType.includes('ogg') ? 'ogg' : 'webm';
        await transcribeAudio(blob, format);
      };
      
      recorder.onerror = (e) => {
        console.error('❌ Recorder error:', e.error);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setLoadingStep(null);
        showToast('❌ Recording error', 'error');
      };
      
      recorder.start(); // Start without timeslice - collect all data until stopped
      setIsRecording(true);
      setIsAutoListening(false); // Explicitly set auto-listening to false when in manual mode
      setLoadingStep('recording');
      setLiveTranscript('🎤 Recording...');
      console.log('✅ Manual recording started');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setLoadingStep(null);
      setIsRecording(false);
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        showToast('❌ Microphone permission required. Please allow microphone access.', 'error');
      } else if (error.name === 'NotFoundError') {
        showToast('❌ No microphone found', 'error');
      } else {
        showToast(`❌ Recording error: ${error.message || error.name}`, 'error');
      }
    }
  };

  const stopRecording = async () => {
    console.log('🛑 stopRecording called');
    console.log('🛑 platform:', Capacitor.getPlatform());
    
    // On native Android, stop the MediaRecorder directly
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const recorder = mediaRecorderRef.current;
      
      console.log('🛑 Android MediaRecorder state:', recorder?.state);
      
      if (!recorder || recorder.state === 'inactive') {
        console.error('❌ No active recording to stop');
        setIsRecording(false);
        setLoadingStep(null);
        return;
      }
      
      try {
        // Stop auto-listen mode if running
        isListeningRef.current = false;
        
        // Stop the recorder - DON'T clear refs yet, let onstop handle it
        console.log('🛑 Stopping recorder...');
        recorder.requestData(); // Get final chunk
        recorder.stop();
        
        console.log('🛑 Android recording stopped');
        
      } catch (err) {
        console.error('❌ Error stopping recording:', err);
        // Clean up on error
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
        setLoadingStep(null);
      }
      return;
    }
    
    // Stop Web Speech API if it's running (desktop/non-Android)
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setIsRecording(false);
      // Note: The recognition.onend handler will trigger analyzQuestion
      return;
    }
    
    // Stop MediaRecorder if it's running (web fallback)
    if (mediaRecorderRef.current && isRecording) {
      stopManualLivePreview(); // stop live preview alongside MediaRecorder
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getAuthToken = () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return null;
      const { state } = JSON.parse(authStorage);
      return state?.token || null;
    } catch {
      return null;
    }
  };

  const analyzQuestion = async (question) => {
    if (!question.trim()) {
      alert('Please record a question first');
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setLoadingStep('analyzing');
    setIsStreaming(true);
    setPerfectAnswer('');
    setResponseTime(null);

    try {
      // Get auth token from persisted auth store
      const token = getAuthToken();
      const apiRoot = getApiRoot();
      const base = (apiRoot || window.location.origin || '').replace(/\/$/, '');
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      
      // Send question with CV, job description, person spec, and AI instructions
      const contextData = {
        interviewerQuestion: question,
        position: session?.position,
        company: session?.company_name,
        sessionType: session?.session_type || 'general',
        cv: session?.cv_content || '',
        jobDescription: session?.job_description || '',
        personSpecification: session?.person_specification || '',
        aiInstructions: session?.metadata?.aiInstructions || '',
      };

      // Use streaming fetch for the perfect answer
      const response = await fetch(
        `${base}/api/smart-ai/get-perfect-answer${tokenQuery}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contextData),
        }
      );

      if (!response.ok) throw new Error('Failed to generate perfect answer');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullAnswer += parseSSEChunk(chunk);
        setPerfectAnswer(fullAnswer);
        
        // Show floating answer in stealth mode
        if (stealthMode && !showFloatingAnswer) {
          setShowFloatingAnswer(true);
        }
      }

      fullAnswer = fullAnswer.trim();
      if (!fullAnswer) {
        throw new Error('Empty AI response');
      }

      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      if (fullAnswer.trim()) {
        showToast('Perfect answer ready', 'success');
      }
      
      // Add to history
      setQuestionHistory(prev => [...prev, {
        question: question,
        perfectAnswer: fullAnswer,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error generating perfect answer:', error);
      const responseError = error?.response?.data?.error;
      showToast(responseError || error?.message || 'Error generating perfect answer. Please try again.', 'error');
    } finally {
      setLoading(false);
      setLoadingStep(null);
      setIsStreaming(false);
    }
  };

  const transcribeAudio = async (audioBlob, format = 'webm') => {
    setLoading(true);
    setLoadingStep('transcribing');
    try {
      console.log('🎤 Transcribing audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type, 'format:', format);

      // Ensure blob has proper MIME type for the format
      const mimeTypes = {
        'webm': 'audio/webm',
        'wav': 'audio/wav',
        'mp3': 'audio/mpeg',
        'ogg': 'audio/ogg',
        'opus': 'audio/opus',
        'mp4': 'audio/mp4',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac'
      };
      const mimeType = mimeTypes[format] || 'audio/webm';
      const finalBlob = new Blob([audioBlob], { type: mimeType });
      console.log('🎤 Final blob:', mimeType, finalBlob.size, 'bytes');

      if (finalBlob.size < 1000) {
        throw new Error('Recording too short. Please speak for at least 2-3 seconds.');
      }

      const formData = new FormData();
      formData.append('audio', finalBlob, `question.${format}`);
      formData.append('format', format);

      // Get auth token
      const token = getAuthToken();
      console.log('🎤 Token available:', !!token);
      
      // Build API URL
      const apiBase = (getApiRoot() || '').replace(/\/$/, '');
      const url = `${apiBase}/api/transcription/transcribe`;
      console.log('🎤 Transcription URL:', url);
      
      // Use native fetch for FormData upload on Android
      const fetchOptions = {
        method: 'POST',
        body: formData,
      };
      
      // Add auth header if token exists
      if (token) {
        fetchOptions.headers = {
          'Authorization': `Bearer ${token}`,
        };
      }
      
      console.log('🎤 Sending request to server...');
      const fetchResponse = await fetch(url, fetchOptions);
      
      console.log('🎤 Response status:', fetchResponse.status, fetchResponse.statusText);
      
      // Get response body for error details
      const responseText = await fetchResponse.text();
      console.log('🎤 Response body:', responseText.substring(0, 500));
      
      if (!fetchResponse.ok) {
        let errData = {};
        try {
          errData = JSON.parse(responseText);
        } catch {}
        throw new Error(errData.message || errData.error || `Server error: ${fetchResponse.status}`);
      }
      
      const data = JSON.parse(responseText);
      const transcribedText = data.text;

      console.log('🎤 Transcription successful:', transcribedText);
      if (!transcribedText || !transcribedText.trim()) {
        throw new Error('No speech detected. Please speak louder or try again.');
      }

      const cleaned = transcribedText.trim();
      setRecordedQuestion(cleaned);
      await analyzQuestion(cleaned);

      setLoadingStep(null);
    } catch (error) {
      console.error('🎤 Transcription failed:', error);
      setLoadingStep(null);
      setLoading(false);
      const errorMessage = (error.message || 'Unknown error').substring(0, 100);
      showToast(`Error: ${errorMessage}`, 'error');
    }
  };

  const checkScreenShare = async () => {
    try {
      // Request screen share to detect what's being shared
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'monitor' }
      });
      
      // Check the display surface being captured
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      // Check if entire screen or window containing this app is shared
      if (settings.displaySurface === 'monitor' || settings.displaySurface === 'window') {
        setScreenShareActive(true);
        setScreenRecording(true);
        
        // Show QR transfer modal automatically
        setShowQRTransfer(true);
        
        alert('⚠️ Screen sharing detected! Transfer to mobile recommended.');
      } else {
        setScreenShareActive(false);
        alert('✓ Safe - sharing different content');
      }
    } catch (error) {
      // User cancelled or denied
      console.log('Screen share check cancelled:', error);
    }
  };

  const endSession = async () => {
    if (confirm('Are you sure you want to end this session?')) {
      try {
        await sessionAPI.end(id);
        navigate('/');
      } catch (error) {
        console.error('Failed to end session:', error);
        alert('Failed to end session. Please try again.');
      }
    }
  };

  if (!session) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="interview-session">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}
      <QRTransferModal 
        isOpen={showQRTransfer}
        onClose={() => setShowQRTransfer(false)}
        sessionId={id}
      />
      
      <div className="session-header">
        <div>
          <h1>{session.title}</h1>
          <div className="session-meta">
            {session.company_name && <span>{session.company_name}</span>}
            {session.position && <span>• {session.position}</span>}
            <span>• Question {currentQuestionIndex + 1} of {sessionQuestions.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-warning" 
            onClick={checkScreenShare}
            title="Check if screen share will expose this app"
          >
            <MonitorUp size={20} />
            Check Share
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowQRTransfer(true)}
            title="Transfer to mobile if sharing screen"
          >
            <QrCode size={20} />
            Transfer
          </button>
          <button className="btn btn-danger" onClick={endSession}>
            End Session
          </button>
        </div>
      </div>

      <div className="session-content">
        {/* Interview Question Recording View - Record interviewer question, get perfect answer */}
        <div className="interview-coaching-view">
          {/* Recording Status */}
          {!recordedQuestion && !perfectAnswer && (
            <div className="recording-status-card">
              <div className="status-content">
                <h2>Interview Coaching Assistant</h2>
                <p>
                  {autoListen
                    ? isProcessingRef.current
                      ? '🤖 Generating answer… still listening for next question.'
                      : '🎤 Auto-listen is ON — speak naturally. Answer auto-generates after a pause.'
                    : 'Click Start Recording to capture the interviewer\'s question, then get the perfect answer.'}
                </p>

                {/* Big mic button — always visible for manual recording */}
                <button
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  title="Click to record interviewer question"
                >
                  {isRecording ? <MicOff size={48} /> : <Mic size={48} />}
                </button>

                {/* Auto-listen pulsing mic indicator - only when autoListen is ON */}
                {autoListen && isAutoListening && (
                  <div className="auto-listen-mic-indicator">
                    <div className={`auto-listen-pulse ${isAutoListening ? 'active' : ''} ${loading ? 'processing' : ''}`}>
                      {loading ? <Loader size={40} className="spinner" /> : <Mic size={48} />}
                    </div>
                    {loading
                      ? <span className="auto-listen-status processing">🤖 Generating answer…</span>
                      : isAutoListening
                        ? <span className="auto-listen-status">🔴 Listening… auto-transcribing</span>
                        : <span className="auto-listen-status">⏳ Starting microphone…</span>}
                  </div>
                )}

                {/* Live transcript box — shown during both auto-listen and manual recording */}
                {(isRecording || isAutoListening) && liveTranscript && (
                  <div className={`live-transcript-box ${liveTranscript.startsWith('🎧') ? 'buffering' : ''}`}>
                    <div className="live-transcript-label">
                      <span className="live-dot" />
                      {liveTranscript.startsWith('🎧') ? 'Buffering next question…' : 'Live transcript'}
                    </div>
                    <p className="live-transcript-text">
                      {liveTranscript.startsWith('🎧') ? liveTranscript.slice(2).trim() : liveTranscript}
                      <span className="typing-cursor">|</span>
                    </p>
                  </div>
                )}

                <div className="status-text">
                  {isRecording && !autoListen && (
                    <div className="recording-indicator">
                      <div className="pulse-ring"></div>
                      <span>🎤 Recording… speak clearly</span>
                    </div>
                  )}
                  {!isRecording && !autoListen && !loading && <span>Ready to record</span>}
                  {loading && !autoListen && (
                    <div className="loading-indicator">
                      <Loader className="spinner" size={24} />
                      <span>
                        {loadingStep === 'transcribing' && 'Transcribing audio…'}
                        {loadingStep === 'analyzing' && 'Generating perfect answer…'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="record-control-buttons">
                  {/* Manual recording buttons — hidden when auto-listen is active */}
                  {!autoListen && (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={startRecording}
                        disabled={isRecording || loading}
                        title="Start recording interviewer question"
                      >
                        <Mic size={18} />
                        <span className="ml-2">Start Recording</span>
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={stopRecording}
                        disabled={!isRecording || loading}
                        title="Stop recording"
                      >
                        <Square size={18} />
                        <span className="ml-2">Stop Recording</span>
                      </button>
                    </>
                  )}

                  {/* Auto-listen checkbox — always visible */}
                  <label
                    className={`auto-listen-toggle ${autoListen ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: autoListen ? '#7fffb2' : '#c0e7ff',
                      background: autoListen ? 'rgba(0,200,100,0.18)' : 'rgba(255,255,255,0.12)',
                      padding: '0.5rem 0.75rem', borderRadius: '6px',
                      border: autoListen ? '1px solid rgba(0,200,100,0.5)' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoListen}
                      onChange={(e) => setAutoListen(e.target.checked)}
                    />
                    <span>Auto-listen (speech-to-text)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Recorded Question Display */}
          {recordedQuestion && (
            <div className="question-display-card">
              <div className="question-header">
                <h3>Interviewer's Question</h3>
                {isRecording && <span className="recording-badge">Still recording...</span>}
              </div>
              <div className="question-box">
                <p>{recordedQuestion}</p>
              </div>
              {!isRecording && (
                <div className="question-controls">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setRecordedQuestion('');
                      setPerfectAnswer('');
                    }}
                  >
                    Re-record Question
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Perfect Answer Display */}
          {perfectAnswer && (
            <div className="perfect-answer-card">
              <div className="answer-header">
                <h3>✨ Perfect Answer</h3>
                <span className="answer-badge">Based on: {session.company_name} + Your CV & Job Description</span>
              </div>
              {loading && loadingStep === 'analyzing' && (
                <div className="loading-indicator">
                  <Loader className="spinner" size={24} />
                  <span>Generating perfect answer...</span>
                </div>
              )}
              <div className={`answer-box ${isAnswerHidden ? 'answer-hidden' : ''}`}>
                {!isAnswerHidden && (
                  <>
                    <div
                      className="answer-text"
                      dangerouslySetInnerHTML={{ __html: formatAnswer(perfectAnswer) }}
                    />
                    {isStreaming && <span className="streaming-cursor">▌</span>}
                  </>
                )}
              </div>
              <div className="answer-controls">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setIsAnswerHidden((prev) => !prev)}
                >
                  {isAnswerHidden ? 'Reveal Answer' : 'Hide Answer'}
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigator.clipboard.writeText(perfectAnswer)}
                  disabled={isAnswerHidden}
                >
                  <Copy size={20} />
                  Copy Answer
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    setRecordedQuestion('');
                    setPerfectAnswer('');
                  }}
                >
                  Next Question
                </button>
              </div>
            </div>
          )}

          {/* ── Conversation History (chat-style bubbles) ── */}
          {questionHistory.length > 0 && (
            <div className="conversation-history">
              <div className="conversation-history-header">
                <span className="conversation-history-title">
                  💬 Conversation History ({questionHistory.length} Q&amp;A{questionHistory.length !== 1 ? 's' : ''})
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => setQuestionHistory([])}
                >
                  Clear
                </button>
              </div>
              <div className="conversation-bubbles">
                {questionHistory.map((item, idx) => (
                  <div key={idx} className="conversation-pair">
                    {/* Interviewer bubble */}
                    <div className="bubble bubble-interviewer">
                      <div className="bubble-label">🎤 Interviewer</div>
                      <p className="bubble-text">{item.question}</p>
                      <span className="bubble-time">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* AI answer bubble */}
                    <div className="bubble bubble-ai">
                      <div className="bubble-label">✨ AI Answer</div>
                      <div
                        className="bubble-text"
                        dangerouslySetInnerHTML={{ __html: formatAnswer(item.perfectAnswer) }}
                      />
                      <div className="bubble-actions">
                        <button
                          className="bubble-copy-btn"
                          onClick={() => navigator.clipboard.writeText(item.perfectAnswer)}
                          title="Copy answer"
                        >
                          <Copy size={13} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={conversationEndRef} />
              </div>
            </div>
          )}

        </div>

        {/* End session-content */}
      </div>

      {/* Floating Answer for Stealth Mode */}
      {stealthMode && (
        <FloatingAnswer 
          answer={perfectAnswer}
          isVisible={showFloatingAnswer}
          onClose={() => setShowFloatingAnswer(false)}
          isStreaming={isStreaming}
          formatAnswer={formatAnswer}
        />
      )}

      {/* Screen Share Detection for Security */}
      {stealthMode && (
        <ScreenShareDetector 
          isScreenShareDetected={isScreenShareDetected}
          onScreenShareDetected={(detected) => setIsScreenShareDetected(detected)}
          onMobileRequired={handleMobileRequired}
        />
      )}
    </div>
  );
}

export default InterviewSession;
