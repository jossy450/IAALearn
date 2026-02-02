import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Copy, QrCode, MonitorUp, Loader, Square } from 'lucide-react';
import { sessionAPI, transcriptionAPI } from '../services/api';
import QRTransferModal from '../components/QRTransferModal';
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
  const [showQRTransfer, setShowQRTransfer] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [autoListen, setAutoListen] = useState(false); // default manual; user can opt-in to auto listening
  const [isAnswerHidden, setIsAnswerHidden] = useState(false); // default reveal; user can hide
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const debounceTimerRef = useRef(null);
  const recordingMimeTypeRef = useRef('audio/webm');
  const conversationEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const { setScreenRecording } = useStealthStore();
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionQuestions]);

  useEffect(() => {
    loadSession();
  }, [id]);


  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
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
      // Check if Web Speech API is available
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        // Use Web Speech API to record interviewer's question
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.continuous = false;  // Single question, not continuous
        recognition.interimResults = true;
        
        let finalTranscript = '';
        
        recognition.onstart = () => {
          console.log('🎤 Recording interviewer question...');
          setIsRecording(true);
          setLoadingStep('recording');
          setRecordedQuestion('');
          setPerfectAnswer('');
        };
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Show real-time transcription of interviewer's question
          setRecordedQuestion(finalTranscript + interimTranscript);
        };
        
        recognition.onerror = (event) => {
          console.error('Web Speech API error:', event.error);
          setIsRecording(false);
          setLoadingStep(null);
          alert('Error recording question. Please try again.');
        };
        
        recognition.onend = () => {
          console.log('🎤 Question recording ended');
          setIsRecording(false);
          
          if (finalTranscript.trim()) {
            setRecordedQuestion(finalTranscript.trim());
            // Auto-analyze the question
            analyzQuestion(finalTranscript.trim());
          } else {
            setLoadingStep(null);
            alert('No speech detected. Please try again.');
          }
        };
        
        recognition.start();
        return;
      }
      
      // Fallback: Use MediaRecorder if Web Speech API not available
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4'
      ];
      const selectedType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = new MediaRecorder(stream, selectedType ? { mimeType: selectedType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      recordingMimeTypeRef.current = selectedType || mediaRecorder.mimeType || 'audio/webm';
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = recordingMimeTypeRef.current || mediaRecorder.mimeType || 'audio/webm';
        const format = resolveFormatFromMime(mimeType);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Validate audio blob
        if (audioBlob.size === 0) {
          alert('No audio recorded. Please try recording again.');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        if (audioBlob.size < 100) {
          alert('Recording too short. Please speak for at least 1 second.');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        console.log('Audio recorded successfully:', audioBlob.size, 'bytes');
        
        await transcribeAudio(audioBlob, format);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    // Stop Web Speech API if it's running
    if (speechRecognitionRef.current) {
      setIsRecording(false);
      speechRecognitionRef.current.stop();
      setLoadingStep(null);
      return;
    }
    
    // Stop MediaRecorder if it's running
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
      const base = (import.meta.env.VITE_API_URL || window.location.origin || '').replace(/\/$/, '');
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      
      // Send question with CV and job description to get perfect answer
      const contextData = {
        interviewerQuestion: question,
        position: session?.position,
        company: session?.company_name,
        cv: session?.cv_content || '',
        jobDescription: session?.job_description || '',
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
        
        const chunk = decoder.decode(value);
        fullAnswer += chunk;
        setPerfectAnswer(fullAnswer);
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
      showToast('Error generating perfect answer. Please try again.', 'error');
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
      console.log('Transcribing interviewer question audio blob:', audioBlob.size, 'bytes');

      const formData = new FormData();
      formData.append('audio', audioBlob, `question.${format}`);
      formData.append('format', format);

      const response = await transcriptionAPI.transcribe(formData);
      const transcribedText = response.data.text;

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
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      showToast(`Transcription failed: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
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
                  <label className="flex items-center gap-2 text-sm text-gray-800 bg-white bg-opacity-40 px-3 py-2 rounded-md border border-white/40">
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
    </div>
  );
}

export default InterviewSession;
