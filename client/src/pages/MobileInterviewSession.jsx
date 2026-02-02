import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Eye, ChevronUp, ChevronDown, Smartphone, Monitor, EyeOff } from 'lucide-react';
import { sessionAPI } from '../services/api';
import useStealthStore from '../store/stealthStore';
import './MobileInterviewSession.css';

function MobileInterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [perfectAnswer, setPerfectAnswer] = useState('');
  const [isAnswerHidden, setIsAnswerHidden] = useState(false);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [answerMinimized, setAnswerMinimized] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { stealthMode } = useStealthStore();
  const pollIntervalRef = useRef(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    loadSession();
    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, [id]);

  const loadSession = async () => {
    try {
      const response = await sessionAPI.getOne(id);
      setSession(response.data.session);
      setAnswerHistory(response.data.session.questions || []);
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Session not found');
      navigate('/');
    }
  };

  const startPolling = () => {
    // Poll for new answers every 1.5 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await sessionAPI.getOne(id);
        const questions = response.data.session.questions || [];
        setAnswerHistory(questions);

        // If there are new answers, update current
        if (questions.length > 0) {
          const latestQuestion = questions[questions.length - 1];
          if (latestQuestion.answer) {
            setPerfectAnswer(latestQuestion.answer);
            setCurrentQuestionIndex(questions.length - 1);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1500);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(perfectAnswer);
    setIsCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < answerHistory.length - 1) {
      const nextQuestion = answerHistory[currentQuestionIndex + 1];
      setPerfectAnswer(nextQuestion.answer || '');
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsAnswerHidden(false);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevQuestion = answerHistory[currentQuestionIndex - 1];
      setPerfectAnswer(prevQuestion.answer || '');
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setIsAnswerHidden(false);
    }
  };

  const currentQuestion = answerHistory[currentQuestionIndex];

  return (
    <div className="mobile-interview-session">
      {/* Header */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <Smartphone size={24} />
          <div className="mobile-header-title">
            <h1>Interview Mode</h1>
            <p>{session?.company_name || 'Interview Session'}</p>
          </div>
        </div>
        <button
          className="btn-switch-desktop"
          onClick={() => navigate(`/session/${id}`)}
          title="Switch to desktop mode"
        >
          <Monitor size={20} />
        </button>
      </div>

      {/* Main Answer Display */}
      <div className={`mobile-answer-container ${answerMinimized ? 'minimized' : ''}`}>
        <div className="answer-header">
          <div className="answer-meta">
            <span className="question-count">
              Q{currentQuestionIndex + 1} of {answerHistory.length}
            </span>
            {isStreaming && <span className="streaming-badge">• Streaming</span>}
          </div>
          <button
            className="btn-minimize"
            onClick={() => setAnswerMinimized(!answerMinimized)}
            title={answerMinimized ? 'Expand' : 'Minimize'}
          >
            {answerMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {!answerMinimized && (
          <>
            {currentQuestion?.question && (
              <div className="mobile-question-display">
                <p className="question-label">Current Question:</p>
                <p className="question-text">{currentQuestion.question}</p>
              </div>
            )}

            <div className={`mobile-answer-box ${isAnswerHidden ? 'hidden' : ''}`}>
              {!isAnswerHidden ? (
                <>
                  <div
                    className="answer-text"
                    dangerouslySetInnerHTML={{ __html: formatAnswer(perfectAnswer) }}
                  />
                  {isStreaming && <span className="streaming-cursor">▌</span>}
                </>
              ) : (
                <div className="answer-hidden-placeholder">
                  <EyeOff size={32} />
                  <p>Answer Hidden</p>
                </div>
              )}
            </div>

            <div className="mobile-answer-controls">
              <button
                className="btn-control"
                onClick={() => setIsAnswerHidden(!isAnswerHidden)}
                title={isAnswerHidden ? 'Show answer' : 'Hide answer'}
              >
                {isAnswerHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                {isAnswerHidden ? 'Reveal' : 'Hide'}
              </button>
              <button
                className="btn-control btn-copy"
                onClick={handleCopy}
                disabled={isAnswerHidden || !perfectAnswer}
                title="Copy answer to clipboard"
              >
                <Copy size={20} />
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      {answerHistory.length > 1 && (
        <div className="mobile-navigation">
          <button
            className="btn-nav"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            title="Previous question"
          >
            ← Previous
          </button>
          <span className="nav-indicator">
            {currentQuestionIndex + 1} / {answerHistory.length}
          </span>
          <button
            className="btn-nav"
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === answerHistory.length - 1}
            title="Next question"
          >
            Next →
          </button>
        </div>
      )}

      {/* History List */}
      {answerHistory.length > 0 && (
        <div className="mobile-history">
          <h3 className="history-title">Recent Answers</h3>
          <div className="history-list">
            {answerHistory.slice(-5).reverse().map((qa, idx) => {
              const actualIndex = answerHistory.length - 1 - idx;
              return (
                <button
                  key={actualIndex}
                  className={`history-item ${actualIndex === currentQuestionIndex ? 'active' : ''}`}
                  onClick={() => {
                    setPerfectAnswer(qa.answer || '');
                    setCurrentQuestionIndex(actualIndex);
                    setIsAnswerHidden(false);
                  }}
                >
                  <span className="history-q-number">Q{actualIndex + 1}</span>
                  <span className="history-question">
                    {qa.question?.substring(0, 40)}...
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!session && (
        <div className="mobile-empty-state">
          <Smartphone size={48} />
          <p>Loading session...</p>
        </div>
      )}

      {answerHistory.length === 0 && session && (
        <div className="mobile-empty-state">
          <Smartphone size={48} />
          <p>No questions answered yet</p>
          <p className="text-muted">Answers will appear here as they are generated</p>
        </div>
      )}
    </div>
  );
}

export default MobileInterviewSession;
