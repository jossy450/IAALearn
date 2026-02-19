import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Copy, QrCode, MonitorUp, Loader, Square } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { sessionAPI, transcriptionAPI, getApiRoot } from '../services/api';
import { startNativeRecording, stopNativeRecording } from '../services/nativeAudioRecorder';
import QRTransferModal from '../components/QRTransferModal';
import FloatingAnswer from '../components/FloatingAnswer';
import ScreenShareDetector from '../components/ScreenShareDetector';
import useStealthStore from '../store/stealthStore';
import './InterviewSession.css';

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
  const [autoListen, setAutoListen] = useState(false); // default manual; user can opt-in to auto listening
  const [isAnswerHidden, setIsAnswerHidden] = useState(false); // default reveal; user can hide
  const [showFloatingAnswer, setShowFloatingAnswer] = useState(false); // floating answer visibility
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const debounceTimerRef = useRef(null);
  const recordingMimeTypeRef = useRef('audio/webm');
  const conversationEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const { setScreenRecording, stealthMode } = useStealthStore();
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

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

  // Request microphone permission on load (browser will prompt)
  useEffect(() => {
    const requestMicPermission = async () => {
      try {
        // On web/Android, requesting getUserMedia will prompt for permission
        // We just log it to let the browser handle it
        console.log('📱 Running on platform:', Capacitor.getPlatform());
        
        // Try to get a dummy stream to trigger permission prompt early
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          console.log('✅ getUserMedia API available - permission prompt will appear when recording');
        }
      } catch (error) {
        console.warn('Media API check failed:', error);
      }
    };
    
    requestMicPermission();
  }, []);

  useEffect(() => {
    loadSession();
  }, [id]);


  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
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
      
      const isAndroid = Capacitor.getPlatform() === 'android' || /android/i.test(navigator.userAgent);
      const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const useAutoListenSpeechToText = !!autoListen && !!WebSpeechRecognition;
      
      // On Android native, use the Capacitor AudioRecorder plugin instead of web getUserMedia
      if (Capacitor.isNativePlatform() && isAndroid) {
        console.log('🎤 Using native AudioRecorder plugin on Android...');
        console.log('🎤 Calling startNativeRecording()...');
        try {
          const result = await startNativeRecording();
          console.log('✅ Native recording started successfully');
          console.log('📁 Start result:', JSON.stringify(result));
          setIsRecording(true);
          setLoadingStep('recording');

          // Auto-listen toggle controls live speech-to-text preview.
          // Recording still works even when this is disabled.
          if (autoListen) {
            try {
              console.log('🎤 Starting native Speech Recognition for live transcription...');
              
              // Check and request permissions
              const permStatus = await SpeechRecognition.checkPermissions();
              if (permStatus.speechRecognition !== 'granted') {
                const reqStatus = await SpeechRecognition.requestPermissions();
                if (reqStatus.speechRecognition !== 'granted') {
                  console.warn('Speech recognition permission not granted');
                }
              }
              
              // Check availability
              const available = await SpeechRecognition.available();
              if (!available.available) {
                console.warn('Native speech recognition not available on this device');
                return; // Still continue with recording, just no live preview
              }
              
              // Set up listener for partial results
              let liveTranscript = '';
              await SpeechRecognition.addListener('partialResults', (data) => {
                if (data.matches && data.matches.length > 0) {
                  // Show the best match as interim result
                  setRecordedQuestion(liveTranscript + data.matches[0]);
                }
              });
              
              // Start listening with continuous mode
              await SpeechRecognition.start({
                language: 'en-US',
                maxResults: 3,
                partialResults: true,
                popup: false // Don't show Google's popup
              });
              
              // Store reference for cleanup
              speechRecognitionRef.current = { native: true };
              console.log('✅ Native speech recognition started');
              
            } catch (speechErr) {
              console.warn('Could not start native speech recognition (non-fatal):', speechErr);
              // Continue without live preview - server transcription will still work
            }
          }
          
          return;
        } catch (err) {
          console.error('❌ Failed to start native recording:', err);
          const msg = typeof err === 'string' ? err : (err?.message || 'Unknown error');
          showToast(`❌ Could not start microphone recording: ${msg}`, 'error');
          setLoadingStep(null);
          setIsRecording(false);
          return;
        }
      }
      
      // Fallback: use MediaRecorder via getUserMedia (web / non-native)
      if (isAndroid || !useAutoListenSpeechToText) {
        console.log('🎤 Using MediaRecorder (web)...');
        
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('❌ getUserMedia not available on this device');
          showToast('❌ Audio input not supported on this device.', 'error');
          setLoadingStep(null);
          setIsRecording(false);
          return;
        }
        
        let stream = null;
        try {
          console.log('Requesting audio stream...');
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('✅ Got audio stream:', stream.id);
          
          const preferredTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4'
          ];
          const selectedType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
          console.log('Selected audio format:', selectedType || 'default');
          
          const mediaRecorder = new MediaRecorder(stream, selectedType ? { mimeType: selectedType } : undefined);
          mediaRecorderRef.current = mediaRecorder;
          recordingMimeTypeRef.current = selectedType || mediaRecorder.mimeType || 'audio/webm';
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            console.log('Data available, chunk size:', event.data.size);
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            const mimeType = recordingMimeTypeRef.current || mediaRecorder.mimeType || 'audio/webm';
            const format = resolveFormatFromMime(mimeType);
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            
            console.log('Recording stopped. Total chunks:', audioChunksRef.current.length, 'Total size:', audioBlob.size, 'bytes');
            
            // Validate audio blob
            if (audioBlob.size === 0) {
              showToast('❌ No audio recorded. Check microphone is working.', 'error');
              stream.getTracks().forEach(track => track.stop());
              setLoadingStep(null);
              setIsRecording(false);
              return;
            }
            
            if (audioBlob.size < 100) {
              showToast('❌ Recording too short. Speak for at least 1-2 seconds.', 'error');
              stream.getTracks().forEach(track => track.stop());
              setLoadingStep(null);
              setIsRecording(false);
              return;
            }
            
            console.log('✅ Audio recorded, transcribing...');
            setLoadingStep('transcribing');
            
            await transcribeAudio(audioBlob, format);
            stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            if (stream) stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setLoadingStep(null);
            showToast(`❌ Recording error: ${event.error}`, 'error');
          };

          mediaRecorder.start();
          setIsRecording(true);
          console.log('✅ Recording started');
          return;
        } catch (error) {
          console.error('Failed to start recording:', error.name, error.message);
          if (stream) stream.getTracks().forEach(track => track.stop());
          setLoadingStep(null);
          setIsRecording(false);
          
          if (error.name === 'NotAllowedError') {
            // Check actual permission state if Permissions API is available
            try {
              if (navigator.permissions && navigator.permissions.query) {
                const status = await navigator.permissions.query({ name: 'microphone' });
                console.log('Permissions API microphone state:', status.state);
                
                if (status.state !== 'denied') {
                  // Permission is not explicitly denied ("granted" or "prompt")
                  // Show a lightweight error with details, without the big settings dialog
                  showToast(
                    `❌ Could not access microphone: ${error.name || ''} ${error.message || ''}`.trim(),
                    'error'
                  );
                  return;
                }
              }
            } catch (permErr) {
              console.warn('Permission API check failed:', permErr);
            }

            // At this point, permission is actually denied
            console.log('Microphone permission denied - showing settings option');
            const openSettings = window.confirm(
              'Microphone permission denied.\n\n' +
              'Enable it in:\nSettings > Apps > Interview Assistant > Permissions > Microphone\n\n' +
              'Tap OK to open Settings.'
            );
            
            if (openSettings) {
              console.log('Opening app settings...');
              try {
                await App.openSettings();
              } catch (settingsError) {
                console.error('Could not open settings:', settingsError);
              }
            }
          } else if (error.name === 'NotFoundError') {
            showToast('❌ No microphone found on this device.', 'error');
          } else if (error.name === 'NotSupportedError') {
            showToast('❌ Secure context required. This app must be accessed via HTTPS or localhost.', 'error');
          } else {
            console.error('Unknown microphone error:', error);
            showToast(
              `❌ Microphone error: ${error.name || ''} ${error.message || ''}`.trim(),
              'error'
            );
          }
          return;
        }
      }
      
      // Web Speech API for desktop (faster, no transcription needed)
      if (useAutoListenSpeechToText) {
        console.log('🎤 Using Web Speech API (desktop)...');
        try {
          // Use Web Speech API to record interviewer's question
          const recognition = new WebSpeechRecognition();
          speechRecognitionRef.current = recognition;
          recognition.lang = 'en-US';
          recognition.continuous = true;  // Allow continuous listening for longer questions
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          
          let finalTranscript = '';
          let recordingTimeout;
          
          recognition.onstart = () => {
            console.log('🎤 Recording interviewer question...');
            setIsRecording(true);
            setLoadingStep('recording');
            // Set a timeout for recording (60 seconds max for longer questions)
            recordingTimeout = setTimeout(() => {
              console.log('Recording timeout - stopping');
              recognition.stop();
            }, 60000);
          };
          
          recognition.onresult = (event) => {
            console.log('onresult event:', { resultIndex: event.resultIndex, resultsLength: event.results.length });
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              console.log(`Result ${i}: isFinal=${event.results[i].isFinal}, transcript="${transcript}"`);
              
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }
            
            // Show real-time transcription of interviewer's question
            const currentText = finalTranscript + interimTranscript;
            console.log('Updating question display:', currentText);
            setRecordedQuestion(currentText);
          };
          
          recognition.onerror = (event) => {
            console.error('Web Speech API error:', event.error);
            clearTimeout(recordingTimeout);
            setIsRecording(false);
            setLoadingStep(null);
            
            // Handle specific errors gracefully
            if (event.error === 'network') {
              showToast(`⚠️ Network issue. Try again.`, 'warning');
            } else if (event.error === 'no-speech') {
              showToast(`⚠️ No speech detected. Try again.`, 'warning');
            } else {
              showToast(`⚠️ Recording failed: ${event.error}. Please try again.`, 'error');
            }
            
            // Don't return - let function continue
          };
          
          recognition.onend = () => {
            clearTimeout(recordingTimeout);
            console.log('🎤 Question recording ended');
            setIsRecording(false);
            setLoadingStep(null);
            
            const trimmedQuestion = finalTranscript.trim();
            console.log('Final transcript:', { trimmedQuestion, finalTranscript });
            
            if (trimmedQuestion) {
              console.log('Auto-analyzing question:', trimmedQuestion);
              setRecordedQuestion(trimmedQuestion);
              // Auto-analyze the question
              setLoadingStep('analyzing');
              analyzQuestion(trimmedQuestion);
            } else {
              console.warn('No speech detected, showing error');
              showToast('❌ No speech detected. Please speak clearly and try again.', 'error');
            }
          };
          
          console.log('Starting Web Speech Recognition...');
          recognition.start();
          return;
        } catch (err) {
          console.error('Failed to initialize Web Speech API:', err);
          setIsRecording(false);
          setLoadingStep(null);
          showToast('❌ Speech recognition not supported. Trying alternative method...', 'warning');
          // Fallback: continue to try MediaRecorder as alternative
          // Don't return - let code continue to next condition
        }
      }
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setLoadingStep(null);
      setIsRecording(false);
      
      let errorMsg = 'Recording failed';
      
      // Detect specific error types
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        const openSettings = window.confirm(
          'Microphone permission is required.\n\n' +
          'Tap OK to open Settings and enable microphone access.'
        );
        
        if (openSettings) {
          await openAppSettings();
        }
        return;
      } else if (error.name === 'NotFoundError' || error.message?.includes('no audio input')) {
        errorMsg = '❌ No microphone found. Check if microphone is connected or available on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMsg = '❌ Recording not supported in your browser. Try a different browser or device.';
      } else if (error.message?.includes('getUserMedia')) {
        errorMsg = '❌ Could not access microphone. Check permissions and try again.';
      }
      
      showToast(errorMsg, 'error');
    }
  };

  const stopRecording = async () => {
    console.log('🛑 stopRecording called');
    console.log('🛑 isNativePlatform:', Capacitor.isNativePlatform());
    console.log('🛑 platform:', Capacitor.getPlatform());
    
    // On native Android, stop the native recorder and send file for transcription
    // Also stop speech recognition if it was running for live preview
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        console.log('🛑 Inside Android stop block');
        setIsRecording(false);
        
        // Stop native speech recognition - DON'T await, it can hang if already stopped
        // Just fire and forget with a timeout
        console.log('🛑 Stopping SpeechRecognition (fire and forget)...');
        try {
          // Don't await - just try to stop and ignore result
          SpeechRecognition.stop().catch(() => {});
          SpeechRecognition.removeAllListeners().catch(() => {});
        } catch (e) {
          // Ignore all errors
        }
        console.log('🛑 SpeechRecognition stop fired');
        
        setLoadingStep('transcribing');

        console.log('🎤 Stopping native recording...');
        const result = await stopNativeRecording();
        console.log('📁 Native recorder result:', JSON.stringify(result));
        
        const filePath = result?.filePath;
        const webPath = result?.webPath;
        console.log('📁 FilePath:', filePath);
        console.log('🌐 WebPath:', webPath);

        if (!filePath && !webPath) {
          console.error('❌ No file path returned from native recorder');
          showToast('❌ No audio file from native recorder.', 'error');
          setLoadingStep(null);
          return;
        }

        let audioBlob = null;

        // On Android, prefer webPath fetch FIRST (most reliable in Capacitor WebView)
        // The webPath is a special Capacitor URL that works directly without file system issues
        if (webPath) {
          try {
            console.log('🌐 Trying webPath fetch (preferred on Android):', webPath);
            const response = await fetch(webPath);
            console.log('📡 Fetch response status:', response.status, response.statusText);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            const rawBlob = await response.blob();
            console.log('✅ Raw blob from webPath - size:', rawBlob.size, 'type:', rawBlob.type);
            // Re-type to audio/mp4 for M4A files (Capacitor may return audio/mpeg incorrectly)
            audioBlob = new Blob([rawBlob], { type: 'audio/mp4' });
            console.log('✅ Re-typed blob - size:', audioBlob.size, 'type:', audioBlob.type);
          } catch (webErr) {
            console.warn('⚠️ webPath fetch failed:', webErr.message);
          }
        }

        // Fallback: Read via Filesystem API if webPath failed
        // Note: For absolute paths, we must NOT use a directory option
        if (!audioBlob && filePath) {
          try {
            console.log('📂 Trying Filesystem read (fallback) with absolute path:', filePath);
            // For absolute paths from native recorder, don't use any directory option
            const fsResult = await Filesystem.readFile({ path: filePath });
            console.log('📂 Filesystem read success, data length:', fsResult.data?.length);

            const base64Data = fsResult.data;
            if (base64Data) {
              console.log('🔄 Converting base64 to blob...');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              audioBlob = new Blob([bytes], { type: 'audio/mp4' });
            }
          } catch (fsErr) {
            console.warn('⚠️ Filesystem read failed:', fsErr.message || fsErr);
          }
        }

        // Validate blob
        if (!audioBlob) {
          console.error('❌ Failed to create audio blob from both webPath and Filesystem');
          showToast('❌ Failed to read recorded audio file.', 'error');
          setLoadingStep(null);
          return;
        }

        if (audioBlob.size === 0) {
          console.error('❌ Audio blob is empty (0 bytes)');
          showToast('❌ No audio recorded. Please try again.', 'error');
          setLoadingStep(null);
          return;
        }

        if (audioBlob.size < 1000) {
          console.warn('⚠️ Audio blob is very small:', audioBlob.size, 'bytes');
          showToast('⚠️ Recording seems too short. Trying anyway...', 'warning');
        }

        console.log('🎯 Sending to transcription API - size:', audioBlob.size, 'type:', audioBlob.type);
        await transcribeAudio(audioBlob, 'm4a');
        return;
      } catch (err) {
        console.error('❌ Native recording error:', err);
        showToast(`❌ Failed to process recorded audio: ${err.message}`, 'error');
        setLoadingStep(null);
        return;
      }
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
      console.log('Transcribing interviewer question audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type, 'format:', format);

      // Ensure blob has proper MIME type for the format
      let finalBlob = audioBlob;
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
      const mimeType = mimeTypes[format] || 'audio/mp4';
      // Always re-create blob with correct type for Android
      finalBlob = new Blob([audioBlob], { type: mimeType });
      console.log('Final blob MIME type:', mimeType, 'size:', finalBlob.size);

      const formData = new FormData();
      formData.append('audio', finalBlob, `question.${format}`);
      formData.append('format', format);
      console.log('FormData prepared with blob size:', finalBlob.size, 'type:', finalBlob.type);

      // Get auth token
      const token = getAuthToken();
      
      // Build API URL - use native fetch to bypass Capacitor HTTP plugin issues
      const apiBase = (getApiRoot() || '').replace(/\/$/, '');
      const url = `${apiBase}/api/transcription/transcribe`;
      
      console.log('Sending FormData to:', url);
      
      // Use native fetch (not axios) for reliable FormData upload on Android
      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          // DO NOT set Content-Type - let browser set multipart/form-data with boundary
        },
        body: formData,
      });
      
      console.log('Fetch response status:', fetchResponse.status);
      
      if (!fetchResponse.ok) {
        const errData = await fetchResponse.json().catch(() => ({}));
        console.error('Transcription error response:', errData);
        throw new Error(errData.message || errData.error || `HTTP ${fetchResponse.status}`);
      }
      
      const data = await fetchResponse.json();
      const transcribedText = data.text;

      console.log('Transcription successful:', transcribedText);
      if (!transcribedText || !transcribedText.trim()) {
        throw new Error('Transcription returned empty text. Please try again with clearer audio.');
      }

      const cleaned = transcribedText.trim();
      setRecordedQuestion(cleaned);
      // Automatically ask AI for perfect answer based on the transcribed question
      await analyzQuestion(cleaned);

      setLoadingStep(null);
    } catch (error) {
      console.error('Transcription failed:', error);
      setLoadingStep(null);
      setLoading(false);
      const errorMessage = error.message || 'Unknown error';
      showToast(`Transcription failed: ${errorMessage}`, 'error');
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
                <p>Click the mic button to record what the interviewer is asking, then get the perfect answer.</p>
                <button 
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  title="Click to record interviewer question"
                >
                  {isRecording ? <MicOff size={48} /> : <Mic size={48} />}
                </button>
                <div className="status-text">
                  {isRecording && (
                    <div className="recording-indicator">
                      <div className="pulse-ring"></div>
                      <span>🎤 Recording... Listening to interviewer question</span>
                    </div>
                  )}
                  {!isRecording && !loading && <span>Ready to record</span>}
                  {loading && (
                    <div className="loading-indicator">
                      <Loader className="spinner" size={24} />
                      <span>
                        {loadingStep === 'recording' && 'Recording question...'}
                        {loadingStep === 'analyzing' && 'Analyzing question and generating perfect answer...'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="record-control-buttons">
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
                    title="Manually stop when the question ends"
                  >
                    <Square size={18} />
                    <span className="ml-2">Stop Recording</span>
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#c0e7ff', background: 'rgba(255,255,255,0.12)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
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
                  Record Next Question
                </button>
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
