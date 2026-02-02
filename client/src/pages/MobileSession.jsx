import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone, Copy, CheckCircle, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { sessionAPI, answerAPI } from '../services/api';
import useStealthStore from '../store/stealthStore';

const MobileSession = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answerHistory, setAnswerHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.matchMedia('(orientation: landscape)').matches);
  const { addToClipboard } = useStealthStore();
  const pollTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);
  const pollDelayRef = useRef(2500);
  const lastSnapshotRef = useRef({ questionText: '', answerText: '' });
  const hasSessionRef = useRef(false);

  // Poll for new questions/answers
  useEffect(() => {
    if (!sessionId) return;

    const hydrateFromStorage = () => {
      try {
        const stored = localStorage.getItem('transferred-session');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (parsed?.session && String(parsed.sessionId) === String(sessionId)) {
          setSession(parsed.session);
          hasSessionRef.current = true;
        }
      } catch {
        // ignore bad storage
      }
    };

    const normalizeHistory = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.session?.questions)) return data.session.questions;
      if (Array.isArray(data?.questions)) return data.questions;
      return [];
    };

    const toHistoryItems = (items) => items.map((item) => ({
      question: item.question || item.question_text || item.questionText || '',
      answer: item.answer || item.answer_text || ''
    })).filter((item) => item.question);

    const fetchSessionOnce = async () => {
      if (hasSessionRef.current) return;
      try {
        const response = await sessionAPI.getOne(sessionId);
        setSession(response.data?.session || response.data);
        hasSessionRef.current = true;
      } catch (error) {
        console.error('Failed to fetch session:', error);
      }
    };

    const fetchLatest = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        await fetchSessionOnce();

        const historyResponse = await answerAPI.getHistory(sessionId);
        const history = toHistoryItems(normalizeHistory(historyResponse.data));

        if (history.length > 0) {
          const latest = history[history.length - 1];
          if (
            latest.question !== lastSnapshotRef.current.questionText ||
            latest.answer !== lastSnapshotRef.current.answerText
          ) {
            setCurrentQuestion(latest.question);
            setCurrentAnswer(latest.answer);
            lastSnapshotRef.current = {
              questionText: latest.question,
              answerText: latest.answer
            };
          }
          setAnswerHistory(history.slice().reverse());
        }

        setConnected(true);
        pollDelayRef.current = 2500;
      } catch (error) {
        console.error('Failed to fetch session:', error);
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          setConnected(hasSessionRef.current);
        } else {
          setConnected(false);
        }
        pollDelayRef.current = Math.min(pollDelayRef.current + 1500, 10000);
      } finally {
        isFetchingRef.current = false;
        pollTimeoutRef.current = setTimeout(fetchLatest, pollDelayRef.current);
      }
    };

    hydrateFromStorage();
    fetchLatest();

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [sessionId]);

  // Track orientation changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleOrientationChange = (e) => {
      setIsLandscape(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleOrientationChange);
    return () => mediaQuery.removeEventListener('change', handleOrientationChange);
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    addToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
      }
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Connection Lost</h2>
          <p className="text-gray-400">Unable to connect to desktop session</p>
        </div>
      </div>
    );
  }

  // Full-screen answer mode (optimized for reading)
  if (fullscreenMode && currentAnswer) {
    const fontSizeClass = isLandscape ? 'text-3xl' : 'text-4xl';
    const paddingClass = isLandscape ? 'p-6' : 'p-8';
    
    return (
      <div className={`min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 text-white flex flex-col justify-center ${paddingClass}`}>
        {/* Question at top (smaller) */}
        {currentQuestion && (
          <div className="text-center mb-6 text-blue-200 text-sm opacity-75">
            {currentQuestion}
          </div>
        )}

        {/* Large Answer */}
        <div className={`${fontSizeClass} leading-relaxed text-center mb-12 flex-grow flex items-center justify-center`}>
          {currentAnswer}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <button 
            onClick={() => handleCopy(currentAnswer)} 
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Copy size={20} /> Copy
          </button>
          <button 
            onClick={() => handleSpeak(currentAnswer)} 
            className={`${speaking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors`}
          >
            {speaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
            {speaking ? 'Stop' : 'Speak'}
          </button>
          <button 
            onClick={() => setFullscreenMode(false)} 
            className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Minimize2 size={20} /> Done
          </button>
        </div>

        {copied && (
          <div className="text-center mt-4 text-green-300 font-semibold animate-pulse">
            ✓ Copied to clipboard!
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-full">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="font-bold text-lg">Mobile Session</div>
              <div className="text-xs text-blue-100">
                {session?.company_name} - {session?.job_title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="text-xs">Live</div>
          </div>
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="text-xs text-gray-400 mb-1">CURRENT QUESTION</div>
          <div className="text-sm font-medium">{currentQuestion}</div>
        </div>
      )}

      {/* Current Answer */}
      {currentAnswer && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg p-4 border border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-blue-300">ANSWER</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSpeak(currentAnswer)}
                  className="p-2 bg-blue-600 bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                  title="Hear answer"
                >
                  {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={() => handleCopy(currentAnswer)}
                  className="p-2 bg-blue-600 bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
                <button
                  onClick={() => setFullscreenMode(true)}
                  className="p-2 bg-purple-600 bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                  title="Full-screen answer view"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
            <div className="text-white leading-relaxed whitespace-pre-wrap line-clamp-6">
              {currentAnswer}
            </div>
            <button
              onClick={() => setFullscreenMode(true)}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2"
            >
              Tap for full-screen view →
            </button>
          </div>

          {copied && (
            <div className="mt-2 text-center text-sm text-green-400">
              ✓ Copied to clipboard!
            </div>
          )}
        </div>
      )}

      {/* Answer History */}
      {answerHistory.length > 1 && (
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-400 mb-3">PREVIOUS ANSWERS</div>
          <div className="space-y-3">
            {answerHistory.slice(1, 6).map((item, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700"
              >
                <div className="text-xs text-gray-400 mb-1">
                  Q: {item.question}
                </div>
                <div className="text-sm text-gray-300 line-clamp-3">
                  {item.answer}
                </div>
                <button
                  onClick={() => {
                    setCurrentQuestion(item.question);
                    setCurrentAnswer(item.answer);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                >
                  View Full Answer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4">
        <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2 text-blue-300">Mobile Mode Active</div>
          <ul className="space-y-1 text-gray-300 text-xs">
            <li>✓ Answers appear here in real-time</li>
            <li>✓ Desktop screen can be shared safely</li>
            <li>✓ Glance at phone naturally</li>
            <li>✓ Tap speaker icon to hear answer</li>
            <li>✓ Tap copy icon for clipboard</li>
          </ul>
        </div>
      </div>

      {/* Keep screen awake indicator */}
      <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-xs flex items-center gap-2">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        Screen awake
      </div>
    </div>
  );
};

export default MobileSession;
