import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Zap, Brain, Copy, QrCode, MonitorUp, Clock, Loader } from 'lucide-react';
import { sessionAPI, transcriptionAPI, answerAPI } from '../services/api';
import QRTransferModal from '../components/QRTransferModal';
import useStealthStore from '../store/stealthStore';
import './InterviewSession.css';

function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [showQRTransfer, setShowQRTransfer] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingMimeTypeRef = useRef('audio/webm');
  const speechRecognitionRef = useRef(null);
  const { setScreenRecording } = useStealthStore();

  useEffect(() => {
    loadSession();
  }, [id]);

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

  const startRecording = async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;
        
        let finalTranscript = '';
        
        recognition.onstart = () => {
          setIsRecording(true);
          setLoadingStep('transcribing');
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
          setCandidateAnswer(finalTranscript + interimTranscript);
        };
        
        recognition.onerror = (event) => {
          console.error('Web Speech API error:', event.error);
          setIsRecording(false);
          setLoadingStep(null);
          setUseManualInput(true);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
          if (finalTranscript.trim()) {
            setCandidateAnswer(finalTranscript.trim());
          } else {
            setLoadingStep(null);
            alert('No speech detected. Please try again.');
          }
        };
        
        recognition.start();
        return;
      }
      
      // Fallback to MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 100) {
          setLoadingStep('transcribing');
          await transcribeAudio(audioBlob, 'webm');
        }
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
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    } else if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob, format = 'webm') => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${format}`);
      formData.append('format', format);

      const response = await transcriptionAPI.transcribe(formData);
      const transcribedText = response.data.text;
      
      if (transcribedText && transcribedText.trim()) {
        setCandidateAnswer(transcribedText);
      } else {
        throw new Error('Transcription returned empty text.');
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      setLoadingStep(null);
      alert('Failed to transcribe audio. Please type your answer instead.');
      setUseManualInput(true);
    } finally {
      setLoadingStep(null);
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

  const analyzeAnswer = useCallback(async (answer) => {
    if (!answer || !answer.trim()) {
      alert('Please provide an answer first.');
      return;
    }

    if (!sessionQuestions[currentQuestionIndex]) {
      alert('No question available');
      return;
    }

    const question = sessionQuestions[currentQuestionIndex];
    const startTime = Date.now();
    setLoading(true);
    setLoadingStep('analyzing');
    setIsStreaming(true);
    setAnswerFeedback('');
    setResponseTime(null);

    try {
      const token = getAuthToken();
      const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : '';
      
      const eventSource = new EventSource(
        `/api/answers-optimized/generate?stream=true&question=${encodeURIComponent(question.question_text)}&sessionId=${id}${tokenQuery}`,
        { withCredentials: true }
      );

      let fullFeedback = '';

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chunk') {
          fullFeedback += data.content;
          setAnswerFeedback(fullFeedback);
        } else if (data.type === 'complete') {
          eventSource.close();
          setIsStreaming(false);
          setLoadingStep(null);
          setLoading(false);
          
          const totalTime = Date.now() - startTime;
          setResponseTime(totalTime);

          setAnsweredQuestions(prev => [...prev, {
            question_text: question.question_text,
            candidate_answer: answer,
            feedback: fullFeedback,
            response_time_ms: totalTime,
            answered_at: new Date().toISOString()
          }]);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);
        setLoadingStep(null);
        setLoading(false);
      };

    } catch (error) {
      console.error('Failed to analyze answer:', error);
      setLoadingStep(null);
      setLoading(false);
      setIsStreaming(false);
    }
  }, [id, currentQuestionIndex, sessionQuestions]);

  const checkScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'monitor' }
      });
      stream.getTracks().forEach(track => track.stop());
      setScreenRecording(true);
      setShowQRTransfer(true);
      alert('⚠️ Screen sharing detected! Transfer to mobile recommended.');
    } catch (error) {
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

  const currentQuestion = sessionQuestions[currentQuestionIndex];

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
            <span>• Question {currentQuestionIndex + 1} of {sessionQuestions.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-warning" 
            onClick={checkScreenShare}
          >
            <MonitorUp size={20} />
            Check Share
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowQRTransfer(true)}
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
        {/* Interview Question */}
        <div className="card question-card">
          <h2>Interview Question</h2>
          {currentQuestion ? (
            <>
              <div className="interview-question">
                <p className="question-text">{currentQuestion.question_text}</p>
              </div>

              {/* Candidate Answer Recording/Input */}
              {!useManualInput ? (
                <>
                  <div className="recording-controls">
                    <button
                      className={`record-btn ${isRecording ? 'recording' : ''}`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={loading}
                    >
                      {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                    </button>
                    <div className="recording-status">
                      {isRecording && <span className="recording-indicator">🎤 Recording...</span>}
                      {loading && (
                        <div className="loading-status">
                          <Loader className="spinner-icon" size={20} />
                          <span>
                            {loadingStep === 'transcribing' && 'Transcribing your answer...'}
                            {loadingStep === 'analyzing' && 'Analyzing your answer...'}
                          </span>
                        </div>
                      )}
                      {!isRecording && !loading && <span>Click mic to record your answer</span>}
                    </div>
                  </div>
                  
                  <div className="manual-input-toggle">
                    <button 
                      className="btn btn-link"
                      onClick={() => setUseManualInput(true)}
                    >
                      Or type your answer instead
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="manual-input-container">
                    <textarea
                      value={manualAnswer}
                      onChange={(e) => setManualAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="question-textarea"
                      disabled={loading}
                    />
                    <div className="manual-input-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          if (manualAnswer.trim()) {
                            setCandidateAnswer(manualAnswer.trim());
                            setLoadingStep('analyzing');
                            analyzeAnswer(manualAnswer.trim());
                            setManualAnswer('');
                          }
                        }}
                        disabled={loading || !manualAnswer.trim()}
                      >
                        <Zap size={18} />
                        Submit Answer
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setUseManualInput(false)}
                        disabled={loading}
                      >
                        Back to Voice
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Display Candidate Answer */}
              {candidateAnswer && !useManualInput && (
                <div className="candidate-answer-display">
                  <h3>Your Answer:</h3>
                  <div className="answer-text-box">{candidateAnswer}</div>
                  <div className="answer-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => analyzeAnswer(candidateAnswer)}
                      disabled={loading}
                    >
                      <Brain size={18} />
                      Get Feedback
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCandidateAnswer('')}
                      disabled={loading}
                    >
                      Re-record
                    </button>
                  </div>
                </div>
              )}

              {/* AI Feedback */}
              {(answerFeedback || (loading && loadingStep === 'analyzing')) && (
                <div className={`card feedback-card ${loading ? 'loading' : 'fade-in'}`}>
                  <div className="feedback-header">
                    <h3>Feedback & Suggestions</h3>
                    <div className="feedback-meta">
                      {loading && loadingStep === 'analyzing' && (
                        <span className="badge badge-streaming">
                          <Loader className="spinner-icon" size={14} />
                          Analyzing...
                        </span>
                      )}
                      {responseTime && (
                        <span className={`badge ${responseTime < 1000 ? 'badge-success' : 'badge-warning'}`}>
                          <Clock size={14} />
                          {responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="feedback-text">
                    {answerFeedback}
                    {isStreaming && <span className="streaming-cursor">▌</span>}
                  </div>
                  {answerFeedback && (
                    <div className="feedback-actions">
                      <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(answerFeedback)}>
                        <Copy size={18} />
                        Copy Feedback
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          setCurrentQuestionIndex(prev => Math.min(prev + 1, sessionQuestions.length - 1));
                          setCandidateAnswer('');
                          setAnswerFeedback('');
                          setManualAnswer('');
                          setUseManualInput(false);
                        }}
                        disabled={currentQuestionIndex >= sessionQuestions.length - 1}
                      >
                        Next Question →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="empty-state">No questions in this session</p>
          )}
        </div>

        {/* Answered Questions Summary */}
        {answeredQuestions.length > 0 && (
          <div className="card">
            <h2>Answered Questions ({answeredQuestions.length})</h2>
            <div className="answered-questions-list">
              {answeredQuestions.map((item, idx) => (
                <div key={idx} className="answered-item">
                  <div className="answered-question">
                    <strong>Q:</strong> {item.question_text}
                  </div>
                  <div className="answered-answer">
                    <strong>Your Answer:</strong> {item.candidate_answer}
                  </div>
                  {item.feedback && (
                    <div className="answered-feedback">
                      <strong>Feedback:</strong> {item.feedback.substring(0, 200)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewSession;
