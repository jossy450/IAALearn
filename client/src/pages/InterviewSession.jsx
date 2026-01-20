import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Zap, Brain, Copy, Save, QrCode, MonitorUp } from 'lucide-react';
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
  const [answerSource, setAnswerSource] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showQRTransfer, setShowQRTransfer] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
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

  const transcribeAudio = async (audioBlob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('format', 'webm');

      const response = await transcriptionAPI.transcribe(formData);
      const transcribedText = response.data.text;
      setCurrentQuestion(transcribedText);
      
      // Automatically generate answer
      await generateAnswer(transcribedText);
    } catch (error) {
      console.error('Transcription failed:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAnswer = async (question, useResearch = false) => {
    setLoading(true);
    setCurrentAnswer('');
    setAnswerSource(null);

    try {
      const response = await answerAPI.generate({
        question,
        sessionId: id,
        research: useResearch,
        context: {
          position: session?.position,
          company: session?.company_name,
          sessionType: session?.session_type
        }
      });

      setCurrentAnswer(response.data.answer);
      setAnswerSource({
        cached: response.data.cached,
        source: response.data.source,
        responseTime: response.data.responseTime
      });

      // Add to questions list
      setQuestions([...questions, {
        question_text: question,
        answer: response.data.answer,
        asked_at: new Date().toISOString()
      }]);

      // Clear current question for next one
      setTimeout(() => setCurrentQuestion(''), 100);
    } catch (error) {
      console.error('Failed to generate answer:', error);
      alert('Failed to generate answer. Please try again.');
    } finally {
      setLoading(false);
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
                {answerSource?.cached && (
                  <span className="badge badge-success">Cached</span>
                )}
                {answerSource?.source && (
                  <span className="badge badge-info">{answerSource.source}</span>
                )}
                {answerSource?.responseTime && (
                  <span className="badge badge-gray">{answerSource.responseTime}ms</span>
                )}
              </div>
            </div>
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
