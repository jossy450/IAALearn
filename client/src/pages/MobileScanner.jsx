import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { sessionAPI } from '../services/api';

const MobileScanner = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const html5QrCodeRef = useRef(null);
  const qrReaderRef = useRef(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    if (scanning && qrReaderRef.current) {
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = async (decodedText) => {
        try {
          if (isConnectingRef.current) return;

          // Extract transfer code from URL or direct code
          let code = decodedText.trim();
          
          // Handle URLs like https://app.com/mobile-transfer?code=ABC123
          if (code.includes('transfer') || code.includes('code=')) {
            const urlParams = code.includes('?') 
              ? new URLSearchParams(code.split('?')[1])
              : new URLSearchParams(code.split('code=')[1]);
            const paramCode = urlParams.get('code') || urlParams.get('transfer');
            if (paramCode) {
              code = paramCode.toUpperCase();
            }
          }

          // Validate code format (6 alphanumeric characters)
          if (code && /^[A-Z0-9]{6}$/.test(code)) {
            isConnectingRef.current = true;
            setError(null);
            setScanning(false);
            if (html5QrCodeRef.current?.isScanning) {
              await html5QrCodeRef.current.stop().catch(() => {});
            }
            await connectWithCode(code);
          } else {
            setError('Invalid QR code format. Expected 6-character code.');
          }
        } catch (err) {
          console.error('QR code parsing error:', err);
          setError('Failed to process QR code. Please try again.');
        }
      };

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      html5QrCode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback
      ).catch((err) => {
        console.error('QR Scanner error:', err);
        setError('Camera access denied or not available');
      });

      return () => {
        if (html5QrCodeRef.current?.isScanning) {
          html5QrCodeRef.current.stop().catch(console.error);
        }
      };
    }
  }, [scanning]);

  const connectWithCode = async (code) => {
    if (isConnectingRef.current && loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await sessionAPI.connectViaTransfer({ code });
      
      if (response.data.success) {
        setSuccess(true);
        setScanning(false);
        
        // Store session info in local storage
        localStorage.setItem('transferred-session', JSON.stringify({
          sessionId: response.data.sessionId,
          session: response.data.session || null,
          transferCode: code,
          transferredAt: Date.now()
        }));

        // Redirect to mobile interview session after 2 seconds
        setTimeout(() => {
          navigate(`/mobile-session/${response.data.sessionId}`);
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid transfer code. Please try again.');
      setScanning(true);
      isConnectingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.length === 6) {
      connectWithCode(manualCode.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Smartphone size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Transfer Session to Mobile</h1>
          <p className="text-gray-400">
            Scan the QR code from your desktop or enter the transfer code manually
          </p>
        </div>

        {success ? (
          <div className="bg-green-900 border border-green-600 rounded-lg p-6 text-center">
            <CheckCircle className="text-green-400 mx-auto mb-4" size={64} />
            <h2 className="text-xl font-bold text-green-400 mb-2">Transfer Complete!</h2>
            <p className="text-gray-300 mb-4">
              Redirecting to your interview session...
            </p>
            <div className="animate-spin mx-auto">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full"></div>
            </div>
          </div>
        ) : (
          <>
            {scanning && (
              <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
                <div ref={qrReaderRef} id="qr-reader" className="w-full"></div>
                <div className="p-4 text-center">
                  <Camera className="inline-block mb-2 text-blue-400" size={24} />
                  <p className="text-sm text-gray-400">Position QR code within frame</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
                <div className="text-sm text-red-200">{error}</div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-400 mb-4">Or enter code manually</div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    6-Digit Transfer Code
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="ABC123"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={manualCode.length !== 6 || loading}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {loading ? 'Connecting...' : 'Connect to Desktop'}
                </button>
              </form>
            </div>

            <div className="mt-6 bg-blue-900 border border-blue-600 rounded-lg p-4 text-sm">
              <div className="font-semibold mb-2 text-blue-300">How it works:</div>
              <ul className="space-y-2 text-gray-300">
                <li>1. Desktop generates QR code or 6-digit code</li>
                <li>2. Scan QR code or enter code on this device</li>
                <li>3. Session transfers to your mobile</li>
                <li>4. Answers appear here while you share desktop screen</li>
              </ul>
            </div>

            {!scanning && (
              <button
                onClick={() => setScanning(true)}
                className="w-full mt-4 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Scan Another QR Code
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileScanner;
