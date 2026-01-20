import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import { Camera, X, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { sessionAPI } from '../services/api';

const MobileScanner = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleScan = async (result, error) => {
    if (result) {
      const scannedData = result.text;
      
      // Extract transfer code from URL or direct code
      let code = scannedData;
      if (scannedData.includes('transfer=')) {
        const urlParams = new URLSearchParams(scannedData.split('?')[1]);
        code = urlParams.get('transfer');
      }

      if (code) {
        await connectWithCode(code);
      }
    }

    if (error) {
      console.error('QR Scan error:', error);
    }
  };

  const connectWithCode = async (code) => {
    setLoading(true);
    setError(null);

    try {
      const response = await sessionAPI.connectViaTransfer(code);
      
      if (response.data.success) {
        setSuccess(true);
        setScanning(false);
        
        // Store session info in local storage
        localStorage.setItem('transferred-session', JSON.stringify({
          sessionId: response.data.sessionId,
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
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.length === 6) {
      connectWithCode(manualCode);
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
                <div className="relative">
                  <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    className="w-full"
                    videoStyle={{ width: '100%' }}
                  />
                  <div className="absolute inset-0 border-4 border-blue-500 pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500"></div>
                  </div>
                </div>
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
