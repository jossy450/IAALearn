import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Volume2, VolumeX, Play, Pause, 
  User, Briefcase, Clock, CheckCircle, XCircle,
  ChevronRight, RefreshCw, Headphones, MessageSquare,
  Lightbulb, Lock, Video, VideoOff
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { canAccess } from '../store/subscriptionStore';
import api from '../services/api';
import InterviewAvatar from '../components/InterviewAvatar';
import './MockInterview.css';

function MockInterview() {
  const navigate = useNavigate();
  const { user, subscription } = useAuthStore();
  const userPlan = subscription?.plan || subscription?.status || 'free';
  
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showUpgradeCta, setShowUpgradeCta] = useState(false);
  const premiumUnlocked =
    isPrivileged ||
    canAccess(userPlan, 'plus') ||
    (user?.email?.toLowerCase?.() === 'jossy450@gmail.com');
  
  const isProPlan =
    isPrivileged ||
    canAccess(userPlan, 'pro') ||
    (user?.email?.toLowerCase?.() === 'jossy450@gmail.com');
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerSuggestion, setAnswerSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [persona, setPersona] = useState('professional');
  const [role, setRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [showSetup, setShowSetup] = useState(true);
  const [answerAssessments, setAnswerAssessments] = useState({});
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceGender, setVoiceGender] = useState('female');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('human-female');
  const [showAvatarVideo, setShowAvatarVideo] = useState(true);
  const avatarRef = useRef(null);
  
  const speechSynthRef = useRef(null);
  const speechReconRef = useRef(null);
  
  useEffect(() => {
    checkAccess();
    loadHistory();
    initSpeech();
    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
      if (speechReconRef.current) {
        speechReconRef.current.abort();
      }
    };
  }, []);
  
  const checkAccess = () => {
    const email = user?.email?.toLowerCase() || '';
    const privileged = 
      email === 'jossy450@gmail.com' ||
      user?.id === 1 ||
      email.includes('owner') ||
      email.includes('developer') ||
      user?.role === 'owner' ||
      user?.role === 'admin' ||
      user?.role === 'developer' ||
      email === 'admin@admin.com' ||
      email === 'mightyjosing@gmail.com';
    
    const subscriber = subscription?.status === 'active' || subscription?.status === 'trialing';
    
    setIsPrivileged(privileged);
    setIsSubscriber(subscriber);
    const access = privileged || subscriber;
    setHasAccess(access);

    // Show CTA if not privileged and not Plus/Pro/Enterprise
    const plan = subscription?.plan || subscription?.status || 'free';
    const isPlus = canAccess(plan, 'plus');
    setShowUpgradeCta(!privileged && !isPlus);
  };
  
  const loadHistory = async () => {
    try {
      const res = await api.get('/mock-interview/history');
      setInterviewHistory(res.data.sessions || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };
  
  const initSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;

      const mapVoice = (v) => ({
        id: v.voiceURI,
        name: v.name,
        lang: v.lang,
        genderHint: v.name.toLowerCase().includes('female') ? 'female' :
                    v.name.toLowerCase().includes('male') ? 'male' : 'neutral',
        raw: v
      });

      const loadVoices = () => {
        const voices = speechSynthRef.current.getVoices().map(mapVoice);
        setAvailableVoices(voices);

        if (!selectedVoiceId && voices.length) {
          const preferred = pickPreferredVoice(voices, voiceGender);
          if (preferred) setSelectedVoiceId(preferred.id);
        }
      };

      loadVoices();
      speechSynthRef.current.onvoiceschanged = loadVoices;
    }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      speechReconRef.current = new SpeechRecognition();
      speechReconRef.current.continuous = false;
      speechReconRef.current.interimResults = true;
      
      speechReconRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setUserAnswer(transcript);
      };
      
      speechReconRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      speechReconRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };
  
  const startInterview = async () => {
    if (!role) {
      alert('Please enter a target role');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await api.post('/mock-interview/session', {
        persona,
        role,
        experienceLevel
      });
      
      setSession(res.data);
      setQuestionNumber(1);
      setShowSetup(false);
      
      // Get first question
      await getNextQuestion(res.data.sessionId, 1);
    } catch (error) {
      console.error('Failed to start interview:', error);
      const status = error.response?.status;
      const msg = error.response?.data?.error;

      if (status === 401) {
        alert('Session expired. Please log in again.');
        navigate('/login');
      } else if (status === 403) {
        alert(msg || 'Subscription required to start a mock interview.');
      } else if (!status) {
        // Likely network/CORS/base URL issue on mobile
        alert('Network error starting interview. Please confirm you opened the app from https://interviewassistant.app (no www) or install the mobile app.');
      } else {
        alert(msg || 'Failed to start interview. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const getNextQuestion = async (sessionId, nextNumber = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/mock-interview/question/${sessionId}?persona=${persona}&questionNumber=${nextNumber}`);
      setCurrentQuestion(res.data.question);
      setQuestionNumber(res.data.questionNumber);
      if (res.data.totalQuestions) setTotalQuestions(res.data.totalQuestions);
      setShowSuggestion(false);
      setAnswerSuggestion(null);
      setLatestAssessment(null);
      
      // Auto-speak the question
      speakQuestion(res.data.question);
    } catch (error) {
      console.error('Failed to get question:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const speakQuestion = (text) => {
    // Use avatar ref if available (new video avatar)
    if (avatarRef.current && premiumUnlocked) {
      avatarRef.current.speak(text);
      setIsSpeaking(true);
      return;
    }
    
    // Fallback to direct speech synthesis
    if (!speechSynthRef.current) return;
    
    speechSynthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = voiceGender === 'male' ? 0.95 : 1.05;

    const voices = availableVoices;
    const selectedVoice = voices.find(v => v.id === selectedVoiceId)?.raw ||
      pickPreferredVoice(voices, voiceGender)?.raw;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthRef.current.speak(utterance);
  };
  
  const stopSpeaking = () => {
    if (avatarRef.current && premiumUnlocked) {
      avatarRef.current.stop();
      setIsSpeaking(false);
      return;
    }
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
  };
  
  const toggleListening = () => {
    if (!speechReconRef.current) {
      alert('Speech recognition is not supported in your browser. Please type your answer.');
      return;
    }
    
    if (isListening) {
      speechReconRef.current.stop();
    } else {
      setUserAnswer('');
      speechReconRef.current.start();
      setIsListening(true);
    }
  };
  
  const getAnswerSuggestion = async () => {
    if (!currentQuestion) return;
    
    setIsLoading(true);
    try {
      const res = await api.post('/mock-interview/suggest-answer', {
        question: currentQuestion,
        persona
      });
      setAnswerSuggestion(res.data.suggestion);
      setShowSuggestion(true);
    } catch (error) {
      console.error('Failed to get suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const submitAnswer = async () => {
    if (!session || !userAnswer.trim()) {
      alert('Please provide an answer or use voice input');
      return;
    }
    
    setIsLoading(true);
    try {
      const submitRes = await api.post('/mock-interview/submit-answer', {
        sessionId: session.sessionId,
        questionNumber,
        answer: userAnswer,
        aiSuggestion: answerSuggestion,
        question: currentQuestion,
        persona
      });
      if (submitRes.data?.assessment) {
        const assessment = submitRes.data.assessment;
        setAnswerAssessments(prev => ({
          ...prev,
          [questionNumber]: assessment
        }));
        setLatestAssessment({ questionNumber, assessment });
      }
      
      if (questionNumber >= totalQuestions) {
        await completeInterview();
      } else {
        // Move to next question
        const nextNum = questionNumber + 1;
        setQuestionNumber(nextNum);

        // Get next question
        const res = await api.get(`/mock-interview/question/${session.sessionId}?persona=${persona}&questionNumber=${nextNum}`);
        setCurrentQuestion(res.data.question);
        if (res.data.totalQuestions) setTotalQuestions(res.data.totalQuestions);
        setShowSuggestion(false);
        setAnswerSuggestion(null);
        setUserAnswer('');
        
        speakQuestion(res.data.question);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [overallScore, setOverallScore] = useState(null);
  
  const completeInterview = async () => {
    try {
      const res = await api.post(`/mock-interview/complete/${session.sessionId}`);
      setFeedback(res.data.feedback || []);
      setOverallScore(res.data.overallScore);
      setShowFeedback(true);
      loadHistory();
    } catch (error) {
      console.error('Failed to complete interview:', error);
      alert('Interview completed! You can review your answers in the history.');
      setSession(null);
      setShowSetup(true);
    }
  };
  
  const endInterview = () => {
    stopSpeaking();
    setSession(null);
    setShowSetup(true);
    setCurrentQuestion(null);
    setUserAnswer('');
    setAnswerSuggestion(null);
    setShowFeedback(false);
  };
  
  const closeFeedback = () => {
    setShowFeedback(false);
    setFeedback([]);
    setOverallScore(null);
    setSession(null);
    setShowSetup(true);
  };
  
  const personas = [
    { id: 'professional', name: 'Sarah', title: 'HR Recruiter', desc: 'Professional, behavioral-focused interviews' },
    { id: 'technical', name: 'Michael', title: 'Technical Lead', desc: 'Technical depth and problem-solving' },
    { id: 'behavioral', name: 'Emily', title: 'HR Manager', desc: 'Culture-fit and situational questions' }
  ];

  const pickPreferredVoice = (voices, gender) => {
    if (!voices?.length) return null;
    const byGender = voices.filter(v => v.genderHint === gender);
    if (byGender.length) return byGender[0];
    const byLang = voices.filter(v => v.lang?.toLowerCase().startsWith('en'));
    return byLang[0] || voices[0];
  };
  
  // No access screen
  if (!hasAccess) {
    return (
      <div className="mock-interview-container">
        <div className="mock-interview-no-access">
          <div className="lock-icon">
            <Lock size={64} />
          </div>
          <h1>Virtual Mock Interview</h1>
          <p className="subtitle">AI-Powered Interview Practice</p>
          
          <div className="access-message">
            <h2>Subscription Required</h2>
            <p>Virtual mock interviews are available to Pro / Enterprise subscribers. Upgrade your plan to access:</p>
            <ul>
              <li>AI-powered interview questions</li>
              <li>Real-time answer suggestions</li>
              <li>Voice-based practice sessions</li>
              <li>Professional feedback</li>
            </ul>
            <button className="upgrade-btn" onClick={() => navigate('/subscription')}>
              Upgrade Now
            </button>
            <p className="muted">Includes Pro features: advanced analytics, unlimited docs, voice & avatar options.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Setup screen
  if (showSetup) {
    return (
      <div className="mock-interview-container">
        <div className="mock-interview-setup">
          <div className="setup-header">
            <Headphones size={48} />
            <h1>Virtual Mock Interview</h1>
            <p className="subtitle">Practice with an AI-powered interviewer</p>
          </div>
          
          <div className="setup-form">
            <div className="form-group">
              <label>Select Interviewer Persona</label>
              <div className="persona-grid">
                {personas.map(p => (
                  <button
                    key={p.id}
                    className={`persona-card ${persona === p.id ? 'active' : ''}`}
                    onClick={() => setPersona(p.id)}
                  >
                    <User size={32} />
                    <h3>{p.name}</h3>
                    <p>{p.title}</p>
                    <span>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Target Role *</label>
              <input
                type="text"
                placeholder="e.g., Frontend Developer, Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input"
              />
            </div>
            
            <div className="form-group">
              <label>Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="input"
              >
                <option value="entry">Entry Level (0-2 years)</option>
                <option value="mid">Mid Level (2-5 years)</option>
                <option value="senior">Senior Level (5-10 years)</option>
                <option value="executive">Executive (10+ years)</option>
              </select>
            </div>

          <div className={`form-group premium-block ${premiumUnlocked ? '' : 'locked'}`}>
              <div className="premium-header">
                <span className="badge">{isProPlan ? 'Pro' : 'Plus'}</span>
                <div>
                  <label>Video Avatar {isProPlan ? '(Pro Plan - Premium Avatar)' : '(Plus Plan)'}</label>
                  <p className="muted">{isProPlan ? 'Choose between animated or premium realistic avatar.' : 'Select human-like video avatar style for the AI interviewer.'}</p>
                </div>
              </div>
              {premiumUnlocked ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                  <InterviewAvatar
                    isSpeaking={false}
                    disabled={true}
                    isPremium={isProPlan}
                    onSettingsChange={(settings) => {
                      if (settings.gender) {
                        setVoiceGender(settings.gender);
                      }
                      if (settings.style) {
                        const styleMap = {
                          professional: 'human-female',
                          friendly: 'human-female',
                          technical: 'human-male',
                          behavioral: 'human-female'
                        };
                        setAvatarStyle(styleMap[settings.style] || 'human-female');
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="premium-grid">
                  <div>
                    <div className="segmented">
                      <button
                        type="button"
                        className={voiceGender === 'female' ? 'active' : ''}
                        onClick={() => setVoiceGender('female')}
                        disabled={!premiumUnlocked}
                      >Female voice</button>
                      <button
                        type="button"
                        className={voiceGender === 'male' ? 'active' : ''}
                        onClick={() => setVoiceGender('male')}
                        disabled={!premiumUnlocked}
                      >Male voice</button>
                    </div>
                    <select
                      className="input voice-select"
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      disabled={!premiumUnlocked || availableVoices.length === 0}
                    >
                      <option value="">{availableVoices.length ? 'Choose voice' : 'System voices unavailable'}</option>
                      {(availableVoices.filter(v => v.genderHint === voiceGender).length ?
                        availableVoices.filter(v => v.genderHint === voiceGender) : availableVoices
                      ).map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="segmented">
                      <button
                        type="button"
                        className={avatarStyle === 'human-female' ? 'active' : ''}
                        onClick={() => setAvatarStyle('human-female')}
                        disabled={!premiumUnlocked}
                      >Female avatar</button>
                      <button
                        type="button"
                        className={avatarStyle === 'human-male' ? 'active' : ''}
                        onClick={() => setAvatarStyle('human-male')}
                        disabled={!premiumUnlocked}
                      >Male avatar</button>
                    </div>
                    <p className="muted small">Video avatar will mirror your selection during playback.</p>
                  </div>
                </div>
              )}
              {!premiumUnlocked && (
                <div className="locked-overlay">Unlock with Plus subscription</div>
              )}
              {!premiumUnlocked && (
                <button
                  type="button"
                  className="upgrade-inline"
                  onClick={() => navigate('/subscription')}
                >
                  Upgrade to Plus to unlock video avatar
                </button>
              )}
            </div>
            
            <button 
              className="start-btn"
              onClick={startInterview}
              disabled={isLoading || !role}
            >
              {isLoading ? 'Starting...' : 'Start Interview'}
              <Play size={20} />
            </button>
          </div>
          
          {interviewHistory.length > 0 && (
            <div className="history-section">
              <h2>Recent Interviews</h2>
              <div className="history-list">
                {interviewHistory.slice(0, 5).map(s => (
                  <div key={s.id} className="history-item">
                    <div className="history-info">
                      <h4>{s.role}</h4>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`status ${s.status}`}>
                      {s.status === 'completed' ? <CheckCircle size={16} /> : <Clock size={16} />}
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Active interview
  return (
    <div className="mock-interview-container">
      <div className="mock-interview-active">
        <div className="interview-header">
          <div className="interviewer-info">
            <div className="interviewer-avatar">
              <User size={32} />
            </div>
            <div>
              <h2>{session?.persona?.name || 'Interviewer'}</h2>
              <span>{session?.persona?.title || 'HR Recruiter'}</span>
            </div>
          </div>
          <div className="interview-progress">
            <span>Question {questionNumber} of {totalQuestions}</span>
            <button className="end-btn" onClick={endInterview}>End Interview</button>
          </div>
        </div>

          <div className="video-interviewer">
          {premiumUnlocked ? (
            <InterviewAvatar
              ref={avatarRef}
              isSpeaking={isSpeaking}
              currentQuestion={currentQuestion}
              disabled={!session}
              isPremium={isProPlan}
              onSettingsChange={(settings) => {
                if (settings.gender) {
                  setVoiceGender(settings.gender);
                }
                if (settings.style) {
                  const styleMap = {
                    professional: 'human-female',
                    friendly: 'human-female',
                    technical: 'human-male',
                    behavioral: 'human-female'
                  };
                  setAvatarStyle(styleMap[settings.style] || 'human-female');
                }
                if (typeof settings.showVideo === 'boolean') {
                  setShowAvatarVideo(settings.showVideo);
                }
              }}
            />
          ) : (
            <div className={`video-avatar rich locked`}>
              <div className={`avatar-visual human-female`} aria-label="AI interviewer avatar">
                <div className="avatar-face">
                  <div className={`avatar-mouth`} />
                  <div className="avatar-wave" aria-hidden="true">
                    <span className="" />
                    <span className="" />
                    <span className="" />
                    <span className="" />
                  </div>
                </div>
              </div>
              <div className="avatar-status">
                <span className="badge">Plus Feature</span>
                <div className="avatar-copy">Animated video avatar with synchronized voice.</div>
                <small className="muted">
                  Upgrade to Plus for video avatar
                </small>
              </div>
              <div className="locked-overlay">Plus only</div>
              <button
                type="button"
                className="upgrade-inline"
                onClick={() => navigate('/subscription')}
              >
                Upgrade to Plus to unlock avatar + premium voices
              </button>
            </div>
          )}
        </div>
        
        <div className="question-section">
          <div className="question-card">
            <div className="question-label">
              <MessageSquare size={20} />
              Question
            </div>
            <p className="question-text">{currentQuestion}</p>
            
            <div className="voice-controls">
              <button 
                className={`voice-btn ${isSpeaking ? 'speaking' : ''}`}
                onClick={() => isSpeaking ? stopSpeaking() : speakQuestion(currentQuestion)}
              >
                {isSpeaking ? <VolumeX size={24} /> : <Volume2 size={24} />}
                {isSpeaking ? 'Stop' : 'Listen Again'}
              </button>
            </div>
          </div>
          
          <div className="suggestion-section">
            <button 
              className="suggestion-btn"
              onClick={getAnswerSuggestion}
              disabled={isLoading}
            >
              <Lightbulb size={20} />
              Get AI Suggestion
            </button>
            
            {showSuggestion && answerSuggestion && (
              <div className="suggestion-card">
                <h4>Suggested Answer</h4>
                <pre>{answerSuggestion}</pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="answer-section">
          <div className="answer-label">
            <Mic size={20} />
            Your Answer
          </div>
          
          <textarea
            className="answer-input"
            placeholder="Type your answer here or click the microphone to speak..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            rows={6}
          />
          
          <div className="answer-actions">
            <button 
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              {isListening ? 'Stop Recording' : 'Start Voice Input'}
            </button>
            
            <button 
              className="submit-btn"
              onClick={submitAnswer}
              disabled={isLoading || !userAnswer.trim()}
            >
              {questionNumber >= totalQuestions ? 'Finish Interview' : 'Next Question'}
              <ChevronRight size={20} />
            </button>
          </div>

      {latestAssessment && (
        <div className="assessment-card">
          <div className="assessment-header">
            <span className="badge">AI Assessment</span>
            <span className="assessment-meta">Question {latestAssessment.questionNumber}</span>
            <div className="score">{latestAssessment.assessment.score}/100</div>
            <div className="threshold">Pass ≥ {latestAssessment.assessment.passThreshold}</div>
          </div>
          <div className="assessment-body">
            <p className="summary">{latestAssessment.assessment.summary}</p>
            <p className="advice-label">Tailored advice</p>
            <p className="advice">{latestAssessment.assessment.advice}</p>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal">
            <div className="feedback-header">
              <h1>Interview Complete!</h1>
              <div className="score-badge">
                <span className="score-label">Overall Score</span>
                <span className="score-value">{overallScore}/100</span>
              </div>
            </div>
            
            <div className="feedback-list">
              {feedback.map((item, index) => (
                <div key={index} className="feedback-item">
                  <div className="feedback-question">
                    <strong>Question {item.questionNumber}</strong>
                  </div>
                  <div className="feedback-content">
                    <div className="feedback-section your-answer">
                      <h4>Your Answer:</h4>
                      <p>{item.userAnswer}</p>
                    </div>
                    <div className="feedback-section feedback-text">
                      <h4>Feedback & Assessment:</h4>
                      <pre>{item.feedback}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="close-feedback-btn" onClick={closeFeedback}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MockInterview;
