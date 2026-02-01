import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Zap, Brain, Copy, Save, QrCode, MonitorUp, Clock } from 'lucide-react';
import { sessionAPI, transcriptionAPI, answerAPI } from '../services/api';
import QRTransferModal from '../components/QRTransferModal';
import useStealthStore from '../store/stealthStore';
import './InterviewSession.css';

function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [answerSource, setAnswerSource] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showQRTransfer, setShowQRTransfer] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [performanceWarning, setPerformanceWarning] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const debounceTimerRef = useRef(null);
  const recordingMimeTypeRef = useRef('audio/webm');
  const { setScreenRecording } = useStealthStore();

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      const response = await sessionAPI.getOne(id);
      setSession(response.data.session);
      setQuestions(response.data.session.questions || []);
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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob, format = 'webm') => {
    setLoading(true);
    try {
      console.log('Transcribing audio blob:', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${format}`);
      formData.append('format', format);

      const response = await transcriptionAPI.transcribe(formData);
      const transcribedText = response.data.text;
      
      console.log('Transcription successful:', transcribedText);
      if (!transcribedText || !transcribedText.trim()) {
        throw new Error('Transcription returned empty text. Please try again with clearer audio.');
      }
      setCurrentQuestion(transcribedText);
      
      // Automatically generate answer
      await generateAnswer(transcribedText);
    } catch (error) {
      console.error('Transcription failed:', error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const providers = error.response?.data?.providers?.join(', ') || 'OpenAI Whisper';
      
      alert(`Failed to transcribe audio: ${errorMessage}\n\nAvailable providers: ${providers}\n\nPlease check:\n- Microphone permissions\n- Audio quality (1+ seconds)\n- API keys configured`);
    } finally {
      setLoading(false);
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

  const generateAnswer = useCallback(async (question, useResearch = false) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const startTime = Date.now();
    setLoading(true);
    setIsStreaming(true);
    setCurrentAnswer('');
    setAnswerSource(null);
    setResponseTime(null);
    setPerformanceWarning(false);

    try {
      // Try streaming first for faster perceived response
      const streamingSupported = !useResearch; // Only fast answers support streaming
      
      if (streamingSupported) {
        // Server-sent events for streaming
        const token = getAuthToken();
        const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
        const eventSource = new EventSource(
          `/api/answers-optimized/generate?stream=true&question=${encodeURIComponent(question)}&sessionId=${id}${tokenQuery}`,
          { withCredentials: true }
        );

        let fullAnswer = '';

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'chunk') {
            fullAnswer += data.content;
            setCurrentAnswer(fullAnswer);
          } else if (data.type === 'error') {
            eventSource.close();
            setIsStreaming(false);
            setLoading(false);
            generateAnswerFallback(question, useResearch, startTime);
          } else if (data.type === 'complete') {
            eventSource.close();
            setIsStreaming(false);
            setLoading(false);
            
            const totalTime = Date.now() - startTime;
            setResponseTime(totalTime);
            
            // Warn if response was slow (> 3 seconds)
            if (totalTime > 3000) {
              setPerformanceWarning(true);
            }
            
            setAnswerSource({
              cached: data.cached || false,
              source: 'streaming',
              responseTime: totalTime
            });

            // Add to questions list
            setQuestions(prev => [...prev, {
              question_text: question,
              answer: fullAnswer,
              asked_at: new Date().toISOString(),
              response_time_ms: totalTime
            }]);

            // Clear current question for next one
            setTimeout(() => setCurrentQuestion(''), 100);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setIsStreaming(false);
          // Fallback to regular API call
          generateAnswerFallback(question, useResearch, startTime);
        };

        return;
      }

      // Non-streaming for research mode
      await generateAnswerFallback(question, useResearch, startTime);
      
    } catch (error) {
      console.error('Failed to generate answer:', error);
      alert('Failed to generate answer. Please try again.');
      setLoading(false);
      setIsStreaming(false);
    }
  }, [id, session]);

  const generateAnswerFallback = async (question, useResearch, startTime) => {
    try {
      const response = answerAPI.generateOptimized
        ? await answerAPI.generateOptimized({
          question,
          sessionId: id,
          research: useResearch,
          stream: false,
          context: {
            position: session?.position,
            company: session?.company_name,
            sessionType: session?.session_type
          }
        })
        : await answerAPI.generate({
        question,
        sessionId: id,
        research: useResearch,
        stream: false,
        context: {
          position: session?.position,
          company: session?.company_name,
          sessionType: session?.session_type
        }
      });

      const totalTime = Date.now() - startTime;
      
      setCurrentAnswer(response.data.answer);
      setResponseTime(totalTime);
      
      // Warn if response was slow
      if (totalTime > 3000) {
        setPerformanceWarning(true);
      }
      
      setAnswerSource({
        cached: response.data.cached,
        source: response.data.source,
        responseTime: totalTime
      });

      // Add to questions list
      setQuestions(prev => [...prev, {
        question_text: question,
        answer: response.data.answer,
        asked_at: new Date().toISOString(),
        response_time_ms: totalTime
      }]);

      // Clear current question for next one
      setTimeout(() => setCurrentQuestion(''), 100);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const copyAnswer = () => {
    navigator.clipboard.writeText(currentAnswer);
    alert('Answer copied to clipboard!');
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
            <span>• {questions.length} questions</span>
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
        {/* Recording Control */}
        <div className="card recording-card">
          <h2>Ask a Question</h2>
          <div className="recording-controls">
            <button
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
            >
              {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            <div className="recording-status">
              {isRecording && <span className="recording-indicator">Recording...</span>}
              {loading && <span>Processing...</span>}
              {!isRecording && !loading && <span>Click to record your question</span>}
            </div>
          </div>

          {currentQuestion && (
            <div className="current-question">
              <h3>Question:</h3>
              <p>{currentQuestion}</p>
              <div className="answer-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => generateAnswer(currentQuestion, false)}
                  disabled={loading}
                >
                  <Zap size={18} />
                  Fast Answer
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => generateAnswer(currentQuestion, true)}
                  disabled={loading}
                >
                  <Brain size={18} />
                  Research Answer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Answer Display */}
        {currentAnswer && (
          <div className="card answer-card fade-in">
            <div className="answer-header">
              <h3>Suggested Answer</h3>
              <div className="answer-meta">
                {isStreaming && (
                  <span className="badge badge-streaming">⚡ Streaming...</span>
                )}
                {answerSource?.cached && (
                  <span className="badge badge-success">✓ Cached</span>
                )}
                {answerSource?.source && (
                  <span className="badge badge-info">{answerSource.source}</span>
                )}
                {responseTime && (
                  <span className={`badge ${responseTime < 1000 ? 'badge-success' : responseTime < 2000 ? 'badge-warning' : 'badge-danger'}`}>
                    <Clock size={14} />
                    {responseTime}ms
                  </span>
                )}
              </div>
            </div>
            {performanceWarning && responseTime > 3000 && (
              <div className="performance-warning">
                ⚠️ Slow response detected ({responseTime}ms). Consider using mobile transfer for stealth mode.
              </div>
            )}
            <div className="answer-text">{currentAnswer}</div>
            <button className="btn btn-secondary" onClick={copyAnswer}>
              <Copy size={18} />
              Copy Answer
            </button>
          </div>
        )}

        {/* Questions History */}
        <div className="card">
          <h2>Question History</h2>
          {questions.length === 0 ? (
            <p className="empty-state">No questions yet</p>
          ) : (
            <div className="questions-history">
              {questions.slice().reverse().map((q, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-question">
                    <strong>Q:</strong> {q.question_text}
                  </div>
                  {q.answer && (
                    <div className="history-answer">
                      <strong>A:</strong> {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InterviewSession;
