import React, { useState, useEffect } from 'react';
import { Gift, Users, Copy, Check, ArrowRight } from 'lucide-react';
import axios from 'axios';

function Referral() {
  const [referralCode, setReferralCode] = useState('');
  const [referralUrl, setReferralUrl] = useState('');
  const [stats, setStats] = useState({ referral_count: 0, total_referrals: 0, claimed_referrals: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const shareReferral = () => {
    const shareText = `Join me on IAA Learn - the AI-powered interview practice app! Use my referral link: ${referralUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'IAA Learn Referral',
        text: shareText,
        url: referralUrl
      });
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="referral-page">
        <div className="loading">Loading referral data...</div>
      </div>
    );
  }

  return (
    <div className="referral-page">
      <div className="referral-header">
        <Gift size={32} />
        <h1>Invite Friends & Earn Rewards</h1>
        <p>Share IAA Learn with friends and earn free premium days!</p>
      </div>

      <div className="referral-card">
        <h2>Your Referral Code</h2>
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

        <button onClick={shareReferral} className="share-btn">
          <ArrowRight size={18} />
          Share Link
        </button>
      </div>

      <div className="referral-stats">
        <div className="stat-box">
          <Users size={24} />
          <div className="stat-value">{stats.total_referrals}</div>
          <div className="stat-label">Total Referrals</div>
        </div>
        <div className="stat-box">
          <Gift size={24} />
          <div className="stat-value">{stats.claimed_referrals}</div>
          <div className="stat-label">Rewards Earned</div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="referral-history">
          <h2>Referral History</h2>
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-info">
                  <span className="history-email">
                    {item.referred_email?.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                  </span>
                  <span className="history-date">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="history-reward">
                  {item.is_claimed ? (
                    <span className="reward-claimed">+{item.reward_value} days</span>
                  ) : (
                    <span className="reward-pending">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="referral-how-it-works">
        <h2>How It Works</h2>
        <ol>
          <li><strong>Share your link</strong> with friends and colleagues</li>
          <li><strong>They sign up</strong> using your referral code</li>
          <li><strong>You both earn</strong> 3 free days of premium!</li>
        </ol>
      </div>
    </div>
  );
}

export default Referral;
