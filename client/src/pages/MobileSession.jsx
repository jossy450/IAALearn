import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone, Copy, CheckCircle, Volume2, VolumeX } from 'lucide-react';
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
  const { addToClipboard } = useStealthStore();

  // Poll for new questions/answers
  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const response = await sessionAPI.getOne(sessionId);
        setSession(response.data);
        
        // Get latest question/answer
        const historyResponse = await answerAPI.getHistory(sessionId);
        if (historyResponse.data.length > 0) {
          const latest = historyResponse.data[0];
          setCurrentQuestion(latest.question);
          setCurrentAnswer(latest.answer);
          setAnswerHistory(historyResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setConnected(false);
      }
    };

    fetchSession();
    const interval = setInterval(fetchSession, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

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
                >
                  {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={() => handleCopy(currentAnswer)}
                  className="p-2 bg-blue-600 bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className="text-white leading-relaxed whitespace-pre-wrap">
              {currentAnswer}
            </div>
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
