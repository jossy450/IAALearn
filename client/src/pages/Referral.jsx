import React, { useState, useEffect } from 'react';
import { Gift, Users, Copy, Check, Share2, MessageCircle } from 'lucide-react';
import axios from 'axios';
import './Referral.css';

function Referral() {
  const [referralCode, setReferralCode] = useState('');
  const [referralUrl, setReferralUrl] = useState('');
  const [stats, setStats] = useState({ total_referrals: 0, signed_up_referrals: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const [codeRes, statsRes, historyRes] = await Promise.all([
        axios.get('/api/referral/code'),
        axios.get('/api/referral/stats'),
        axios.get('/api/referral/history')
      ]);
      
      setReferralCode(codeRes.data.referralCode);
      setReferralUrl(codeRes.data.referralUrl);
      setStats(statsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareViaNative = async () => {
    setSharing(true);
    const shareText = `Hey! Check out IAA Learn - it's an AI-powered interview practice app that helped me prepare for job interviews. Use my referral link to sign up: ${referralUrl}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'IAA Learn - Interview Practice App',
          text: shareText,
          url: referralUrl
        });
      } else {
        copyToClipboard();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        copyToClipboard();
      }
    } finally {
      setSharing(false);
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Hey! Check out IAA Learn - it's an AI-powered interview practice app that helped me prepare for job interviews. Use my referral link: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = 'Check out IAA Learn - Interview Practice App';
    const body = `Hey!\n\nI wanted to share this app with you - IAA Learn. It's an AI-powered interview practice tool that helps you prepare for job interviews.\n\nUse my referral link to sign up: ${referralUrl}\n\nHope it helps you as much as it's helped me!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="referral-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="referral-page">
      <div className="referral-header">
        <div className="referral-icon">
          <Gift size={36} />
        </div>
        <h1>Invite Friends</h1>
        <p>Share IAA Learn with friends preparing for interviews</p>
      </div>

      <div className="referral-card">
        <h2>Your Unique Referral Code</h2>
        <div className="referral-code-display">
          <span className="referral-code">{referralCode}</span>
        </div>
        
        <div className="referral-url-box">
          <input 
            type="text" 
            value={referralUrl} 
            readOnly 
            className="referral-url-input"
          />
          <button onClick={copyToClipboard} className="copy-btn">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="share-buttons">
          <button onClick={shareViaNative} className="share-btn share-native" disabled={sharing}>
            <Share2 size={18} />
            {sharing ? 'Sharing...' : 'Share Link'}
          </button>
        </div>

        <div className="quick-share">
          <button onClick={shareViaWhatsApp} className="quick-share-btn whatsapp">
            <MessageCircle size={20} />
            WhatsApp
          </button>
          <button onClick={shareViaEmail} className="quick-share-btn email">
            ✉️ Email
          </button>
        </div>
      </div>

      <div className="referral-stats">
        <div className="stat-box highlight">
          <Users size={28} />
          <div className="stat-value">{stats.signed_up_referrals}</div>
          <div className="stat-label">Friends Joined</div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="referral-history">
          <h2>Your Referrals</h2>
          <div className="history-list">
            {history.map((item, index) => (
              <div key={item.id} className="history-item">
                <div className="history-avatar">
                  {item.full_name?.[0] || item.email?.[0] || '?'}
                </div>
                <div className="history-info">
                  <span className="history-name">
                    {item.full_name || item.email?.split('@')[0] || 'New User'}
                  </span>
                  <span className="history-date">
                    Joined {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="history-status">
                  <span className="status-joined">Joined ✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="referral-tips">
        <h2>Share with Friends</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <h3>Job Seekers</h3>
            <p>Friends preparing for interviews will love this tool</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">📚</div>
            <h3>Career Changers</h3>
            <p>Anyone transitioning to a new role</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">💼</div>
            <h3>Professionals</h3>
            <p>Those looking to advance their career</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Referral;
