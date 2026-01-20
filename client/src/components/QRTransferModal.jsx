import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { sessionAPI } from '../services/api';

const QRTransferModal = ({ isOpen, onClose, sessionId }) => {
  const [transferCode, setTransferCode] = useState(null);
  const [transferUrl, setTransferUrl] = useState(null);
  const [isTransferred, setIsTransferred] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sessionId) {
      generateTransferCode();
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (!isOpen) return;

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          generateTransferCode(); // Regenerate when expired
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    // Check transfer status
    const statusCheck = setInterval(async () => {
      if (transferCode) {
        try {
          const response = await sessionAPI.checkTransferStatus(transferCode);
          if (response.data.transferred) {
            setIsTransferred(true);
          }
        } catch (error) {
          console.error('Status check failed:', error);
        }
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(statusCheck);
    };
  }, [isOpen, transferCode]);

  const generateTransferCode = async () => {
    setLoading(true);
    try {
      const response = await sessionAPI.generateTransferCode(sessionId);
      const { code, url } = response.data;
      setTransferCode(code);
      setTransferUrl(url);
      setCountdown(60);
      setIsTransferred(false);
    } catch (error) {
      console.error('Failed to generate transfer code:', error);
    } finally {
      setLoading(false);
    }
  };

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
                  <div className="bg-white border-4 border-gray-200 rounded-lg p-4 mb-4 inline-block">
                    <QRCodeSVG
                      value={transferUrl || ''}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-blue-600">{transferCode}</div>
                      <div className="text-sm text-gray-600">Transfer Code</div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                      <AlertCircle size={16} />
                      <div>
                        <strong>Expires in {countdown} seconds</strong>
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
