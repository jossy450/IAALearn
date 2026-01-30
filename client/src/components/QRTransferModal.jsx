import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Smartphone, AlertCircle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { sessionAPI } from '../services/api';

const QRTransferModal = ({ isOpen, onClose, sessionId }) => {
  const [transferCode, setTransferCode] = useState(null);
  const [transferUrl, setTransferUrl] = useState(null);
  const [isTransferred, setIsTransferred] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [loading, setLoading] = useState(true);
  const [statusCheckInterval, setStatusCheckInterval] = useState(2000); // Dynamic interval
  
  // Performance refs
  const timerRef = useRef(null);
  const statusCheckRef = useRef(null);
  const codeGenerationCache = useRef(new Map());

  // Memoize base URL for better performance
  const baseUrl = useMemo(() => {
    return window.location.origin;
  }, []);

  useEffect(() => {
    if (isOpen && sessionId) {
      // Check cache first for recent codes
      const cachedCode = codeGenerationCache.current.get(sessionId);
      if (cachedCode && (Date.now() - cachedCode.timestamp) < 60000) {
        // Use cached code if less than 1 minute old
        setTransferCode(cachedCode.code);
        setTransferUrl(cachedCode.url);
        setCountdown(Math.floor((cachedCode.expiresAt - Date.now()) / 1000));
        setLoading(false);
      } else {
        generateTransferCode();
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    };
  }, [isOpen, sessionId]);

  // Optimized status checking with exponential backoff
  const checkTransferStatus = useCallback(async () => {
    if (!transferCode || isTransferred) return;
    
    try {
      const response = await sessionAPI.checkTransferStatus(transferCode);
      if (response.data.transferred) {
        setIsTransferred(true);
        // Clear intervals on successful transfer
        if (timerRef.current) clearInterval(timerRef.current);
        if (statusCheckRef.current) clearInterval(statusCheckRef.current);
        return true;
      }
      // Gradually increase polling interval to reduce load
      if (statusCheckInterval < 10000) {
        setStatusCheckInterval(prev => Math.min(prev + 500, 10000));
      }
      return false;
    } catch (error) {
      console.error('Status check failed:', error);
      // On error, slow down polling
      setStatusCheckInterval(prev => Math.min(prev + 1000, 15000));
      return false;
    }
  }, [transferCode, isTransferred, statusCheckInterval]);

  useEffect(() => {
    if (!isOpen || !transferCode) return;

    // Countdown timer
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          generateTransferCode(); // Regenerate when expired
          return 300; // 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    // Smart status checking with dynamic interval
    statusCheckRef.current = setInterval(checkTransferStatus, statusCheckInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    };
  }, [isOpen, transferCode, statusCheckInterval, checkTransferStatus]);

  const generateTransferCode = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sessionAPI.generateTransferCode(sessionId);
      const { code, url, expiresIn } = response.data;
      
      // Ensure URL is properly formatted for QR encoding
      let qrUrl = url;
      if (!qrUrl.startsWith('http')) {
        qrUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
      }
      
      console.log('🔍 QR Code Debug:', {
        code,
        rawUrl: url,
        qrUrl,
        baseUrl,
        expiresIn
      });
      
      setTransferCode(code);
      setTransferUrl(qrUrl);
      setCountdown(expiresIn || 300); // Use server-provided expiry
      setIsTransferred(false);
      setStatusCheckInterval(2000); // Reset interval
      
      // Cache the code for quick re-use
      codeGenerationCache.current.set(sessionId, {
        code,
        url: qrUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + ((expiresIn || 300) * 1000)
      });
      
      // Cleanup old cache entries
      for (const [key, value] of codeGenerationCache.current.entries()) {
        if (Date.now() - value.timestamp > 300000) {
          codeGenerationCache.current.delete(key);
        }
      }
    } catch (error) {
      console.error('Failed to generate transfer code:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, baseUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <Smartphone className="text-blue-600" size={32} />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Transfer to Mobile</h2>
          <p className="text-gray-600 mb-6">
            Scan this QR code with your phone to continue the interview session on mobile
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <>
              {!isTransferred ? (
                <>
                  <div className="bg-white border-4 border-gray-200 rounded-lg p-6 mb-4 inline-block">
                    <QRCodeCanvas
                      value={transferUrl || ''}
                      size={280}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-blue-600">{transferCode}</div>
                      <div className="text-sm text-gray-600">Transfer Code</div>
                      {transferUrl && (
                        <div className="text-xs text-gray-500 mt-2 break-all px-2">
                          {transferUrl}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                      <AlertCircle size={16} />
                      <div>
                        <strong>Expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</strong>
                        <div className="text-xs">Scan quickly or refresh</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-left space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">1</div>
                      <div>Open camera or QR scanner app on your phone</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                      <div>Scan the QR code above</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                      <div>Interview continues on your mobile device</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">4</div>
                      <div>Share your desktop screen safely (no app visible)</div>
                    </div>
                  </div>

                  <button
                    onClick={generateTransferCode}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Refresh QR Code
                  </button>
                </>
              ) : (
                <div className="py-8">
                  <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
                    <CheckCircle className="text-green-600" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-green-600 mb-2">
                    Transfer Complete!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your session is now active on your mobile device. All answers will appear there.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
                    <div className="font-semibold mb-2">Next Steps:</div>
                    <ul className="space-y-1 text-gray-700">
                      <li>✓ Check your phone - session is active</li>
                      <li>✓ You can now share your desktop screen</li>
                      <li>✓ Answers will appear on your phone</li>
                      <li>✓ Glance at phone naturally during interview</li>
                    </ul>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-4"
                  >
                    Got It!
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRTransferModal;
