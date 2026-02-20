import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * Stripe redirects here after checkout with ?session_id=xxx
 * We verify the session server-side and show success/failure.
 */
function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [plan, setPlan] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No session ID found. Payment may not have completed.');
      return;
    }

    api
      .get(`/subscriptions/stripe/session-status?session_id=${sessionId}`)
      .then((res) => {
        const data = res.data;
        if (data.paid) {
          setPlan(data.plan || 'subscription');
          setEmail(data.customer_email || '');
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(`Payment not completed. Status: ${data.payment_status}`);
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(
          err?.response?.data?.error ||
            err.message ||
            'Failed to verify payment. Please contact support.'
        );
      });
  }, [sessionId]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {status === 'loading' && (
          <>
            <Loader size={56} style={{ ...styles.icon, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <h2 style={styles.title}>Verifying your payment…</h2>
            <p style={styles.subtitle}>Please wait while we confirm your subscription.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} style={{ ...styles.icon, color: '#10b981' }} />
            <h2 style={{ ...styles.title, color: '#10b981' }}>Payment Successful! 🎉</h2>
            <p style={styles.subtitle}>
              Your <strong style={{ textTransform: 'capitalize' }}>{plan}</strong> subscription is now active.
              {email && (
                <>
                  {' '}A confirmation has been sent to <strong>{email}</strong>.
                </>
              )}
            </p>
            <div style={styles.actions}>
              <button style={styles.btnPrimary} onClick={() => navigate('/')}>
                Go to Dashboard
              </button>
              <button style={styles.btnSecondary} onClick={() => navigate('/subscription')}>
                View Subscription
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} style={{ ...styles.icon, color: '#ef4444' }} />
            <h2 style={{ ...styles.title, color: '#ef4444' }}>Payment Not Confirmed</h2>
            <p style={styles.subtitle}>{errorMsg}</p>
            <div style={styles.actions}>
              <button style={styles.btnPrimary} onClick={() => navigate('/subscription')}>
                Try Again
              </button>
              <button style={styles.btnSecondary} onClick={() => navigate('/')}>
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1420 100%)',
    padding: '2rem',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: '20px',
    padding: '3rem 2.5rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  icon: {
    marginBottom: '1.25rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '0.75rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'linear-gradient(120deg, #2563eb 0%, #60a5fa 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
  },
};

export default CheckoutReturn;
