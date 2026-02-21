import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import api from '../services/api';
import { Check, Gift, Shield, Zap, Star, X, Video, Users, Cpu } from 'lucide-react';
import './SubscriptionPage.css';

// ── Stripe publishable key from Vite env ──────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Annual pricing (save ~17%) ────────────────────────────────────────────────
const ANNUAL_PRICES = { basic: 99, pro: 199, enterprise: 499 };
const MONTHLY_PRICES = { basic: 9.99, pro: 19.99, enterprise: 49.99 };

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'basic',
    name: 'Essentials',
    monthlyPrice: 9.99,
    annualPrice: 99,
    currency: '£',
    description: 'Perfect for individual job seekers',
    icon: <Zap size={28} />,
    color: '#3b82f6',
    features: [
      'Unlimited AI interview sessions',
      'Priority AI responses',
      'Email support',
      '3 document uploads per session',
      '🥷 Stealth mode access',
      '📱 Mobile app access',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    monthlyPrice: 19.99,
    annualPrice: 199,
    currency: '£',
    description: 'For serious job seekers',
    icon: <Star size={28} />,
    color: '#8b5cf6',
    popular: true,
    features: [
      'Everything in Essentials',
      'Unlimited document uploads',
      '📊 Advanced analytics',
      '🎬 Session recording & playback',
      'Custom AI instructions',
      'Session history export',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 49.99,
    annualPrice: 499,
    currency: '£',
    description: 'For teams and organisations',
    icon: <Shield size={28} />,
    color: '#10b981',
    features: [
      'Everything in Professional',
      '👥 Team collaboration',
      'Team management dashboard',
      'Custom branding',
      '🔌 API access',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
];

// ── Inner checkout form (rendered inside <Elements>) ──────────────────────────
function CheckoutForm({ plan, clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setErrorMsg('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // No redirect — we handle everything in-page
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message || 'Payment failed. Please try again.');
      setPaying(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Tell server to activate subscription
      try {
        await api.post('/subscriptions/stripe/confirm-payment', {
          paymentIntentId: paymentIntent.id,
          plan: plan.id,
        });
        onSuccess(plan);
      } catch (err) {
        setErrorMsg('Payment succeeded but subscription activation failed. Please contact support.');
      }
    } else {
      setErrorMsg('Payment was not completed. Please try again.');
    }
    setPaying(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Plan summary */}
      <div style={formStyles.planSummary}>
        <span style={{ color: plan.color, fontWeight: 700, fontSize: '1.1rem' }}>{plan.name}</span>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>
          {plan.currency}{plan.price}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>{plan.period}</span>
        </span>
      </div>

      {/* Stripe Payment Element */}
      <div style={formStyles.elementWrap}>
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: { billingDetails: { email: 'auto' } },
          }}
        />
      </div>

      {errorMsg && (
        <div style={formStyles.error}>{errorMsg}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        style={{
          ...formStyles.payBtn,
          background: paying ? 'rgba(99,91,255,0.5)' : `linear-gradient(135deg, #635bff 0%, #7c3aed 100%)`,
          cursor: paying ? 'not-allowed' : 'pointer',
        }}
      >
        {paying ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span style={formStyles.spinner} /> Processing…
          </span>
        ) : (
          `Pay ${plan.currency}${plan.price} now`
        )}
      </button>

      <button type="button" onClick={onCancel} style={formStyles.cancelBtn}>
        Cancel
      </button>

      <p style={formStyles.secureNote}>
        🔒 Secured by Stripe · Your card details are never stored on our servers
      </p>
    </form>
  );
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ plan, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(true);
  const [intentError, setIntentError] = useState('');

  useEffect(() => {
    setLoadingIntent(true);
    setIntentError('');
    api.post('/subscriptions/stripe/create-payment-intent', { plan: plan.id })
      .then(res => {
        setClientSecret(res.data.clientSecret);
        setLoadingIntent(false);
      })
      .catch(err => {
        setIntentError(err?.response?.data?.error || err.message || 'Failed to initialise payment.');
        setLoadingIntent(false);
      });
  }, [plan.id]);

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#635bff',
      colorBackground: '#0f172a',
      colorText: '#f1f5f9',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.modal}>
        {/* Header */}
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Complete your subscription</h2>
          <button onClick={onClose} style={modalStyles.closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {loadingIntent && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ ...formStyles.spinner, margin: '0 auto 1rem', width: 32, height: 32, borderWidth: 3 }} />
            Preparing secure payment…
          </div>
        )}

        {intentError && (
          <div style={{ padding: '1.5rem', color: '#ef4444', textAlign: 'center' }}>
            {intentError}
            <br />
            <button onClick={onClose} style={{ ...formStyles.cancelBtn, marginTop: '1rem' }}>Go back</button>
          </div>
        )}

        {!loadingIntent && !intentError && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <CheckoutForm
              plan={plan}
              clientSecret={clientSecret}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ plan, onContinue }) {
  return (
    <div style={successStyles.wrap}>
      <div style={successStyles.card}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={successStyles.title}>Payment Successful!</h2>
        <p style={successStyles.sub}>
          Your <strong style={{ color: plan.color }}>{plan.name}</strong> subscription is now active.
          You have full access to all features.
        </p>
        <button onClick={onContinue} style={successStyles.btn}>
          Start Using IAALearn →
        </button>
      </div>
    </div>
  );
}

// ── Main SubscriptionPage ─────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [successPlan, setSuccessPlan] = useState(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialMsg, setTrialMsg] = useState('');
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    api.get('/subscriptions/status')
      .then(res => setSubscription(res.data))
      .catch(() => setSubscription(null));
  }, []);

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setTrialMsg('');
    try {
      const res = await api.post('/subscriptions/trial');
      setSubscription(res.data);
      setTrialMsg('success');
    } catch {
      setTrialMsg('error');
    } finally {
      setTrialLoading(false);
    }
  };

  const handlePaymentSuccess = useCallback((plan) => {
    setSelectedPlan(null);
    setSuccessPlan(plan);
    api.get('/subscriptions/status').then(res => setSubscription(res.data)).catch(() => {});
  }, []);

  if (successPlan) {
    return <SuccessScreen plan={successPlan} onContinue={() => navigate('/')} />;
  }

  const isActive = subscription?.status === 'active';
  const isTrial  = subscription?.status === 'trial';

  // Build display plans with resolved price/period based on billing toggle
  const displayPlans = PLANS.map(p => ({
    ...p,
    price:  annual ? p.annualPrice  : p.monthlyPrice,
    period: annual ? '/year'        : '/month',
    billingId: annual ? `${p.id}_annual` : p.id,
  }));

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.header}>
        <h1 style={pageStyles.h1}>Choose Your Plan</h1>
        <p style={pageStyles.sub}>Unlock the full power of AI-assisted interview preparation</p>
      </div>

      {/* Active subscription banner */}
      {isActive && (
        <div style={pageStyles.activeBanner}>
          ✅ You have an active <strong>{subscription.plan}</strong> subscription
          {subscription.end_date && ` · renews ${new Date(subscription.end_date).toLocaleDateString()}`}
        </div>
      )}

      {/* Free Trial card */}
      {!isActive && (
        <div style={pageStyles.trialCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Gift size={32} style={{ color: '#f59e0b' }} />
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontWeight: 800 }}>7-Day Free Trial</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                Full access · No credit card required
              </p>
            </div>
          </div>
          {isTrial ? (
            <div style={pageStyles.trialActive}>
              ✅ Trial active · {subscription?.days_remaining || '7'} days remaining
            </div>
          ) : (
            <button onClick={handleStartTrial} disabled={trialLoading} style={pageStyles.trialBtn}>
              {trialLoading ? 'Starting…' : 'Start Free Trial'}
            </button>
          )}
          {trialMsg === 'success' && <p style={{ color: '#10b981', marginTop: '0.75rem', fontWeight: 600 }}>Trial started! Enjoy full access for 7 days.</p>}
          {trialMsg === 'error'   && <p style={{ color: '#ef4444', marginTop: '0.75rem' }}>Could not start trial. You may have already used it.</p>}
        </div>
      )}

      {/* Billing toggle */}
      <div style={pageStyles.toggleRow}>
        <span style={{ color: !annual ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>Monthly</span>
        <button
          onClick={() => setAnnual(a => !a)}
          style={{
            ...pageStyles.toggleBtn,
            background: annual ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(255,255,255,0.12)',
          }}
          aria-label="Toggle annual billing"
        >
          <span style={{
            ...pageStyles.toggleThumb,
            transform: annual ? 'translateX(22px)' : 'translateX(2px)',
          }} />
        </button>
        <span style={{ color: annual ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
          Annual <span style={pageStyles.saveBadge}>Save 17%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div style={pageStyles.grid}>
        {displayPlans.map(plan => {
          const isCurrent = isActive && subscription?.plan === plan.id;
          return (
            <div
              key={plan.id}
              style={{
                ...pageStyles.card,
                borderColor: plan.popular ? plan.color : 'rgba(255,255,255,0.1)',
                boxShadow: plan.popular ? `0 0 0 2px ${plan.color}40, 0 20px 60px rgba(0,0,0,0.4)` : '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              {plan.popular && (
                <div style={{ ...pageStyles.badge, background: plan.color }}>Most Popular</div>
              )}

              <div style={{ color: plan.color, marginBottom: '0.75rem' }}>{plan.icon}</div>
              <h3 style={pageStyles.planName}>{plan.name}</h3>
              <p style={pageStyles.planDesc}>{plan.description}</p>

              <div style={pageStyles.priceRow}>
                <span style={pageStyles.currency}>{plan.currency}</span>
                <span style={pageStyles.price}>{plan.price}</span>
                <span style={pageStyles.period}>{plan.period}</span>
              </div>
              {annual && (
                <p style={pageStyles.annualNote}>
                  Billed as {plan.currency}{plan.price}/year · save {plan.currency}{Math.round(plan.monthlyPrice * 12 - plan.price)}
                </p>
              )}

              <ul style={pageStyles.featureList}>
                {plan.features.map((f, i) => (
                  <li key={i} style={pageStyles.featureItem}>
                    <Check size={15} style={{ color: plan.color, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                style={{
                  ...pageStyles.subscribeBtn,
                  background: `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}cc 100%)`,
                  opacity: isCurrent ? 0.5 : 1,
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
                disabled={isCurrent}
              >
                {isCurrent
                  ? '✓ Current Plan'
                  : `Subscribe · ${plan.currency}${plan.price}${annual ? '/yr' : '/mo'}`}
              </button>
            </div>
          );
        })}
      </div>

      <p style={pageStyles.footer}>
        🔒 Payments secured by Stripe · Cancel anytime · 14-day money-back guarantee
      </p>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem 1.5rem 4rem',
    color: '#fff',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  h1: {
    fontSize: '2.25rem',
    fontWeight: 900,
    margin: '0 0 0.5rem',
    background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '1.05rem',
    margin: 0,
  },
  activeBanner: {
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.35)',
    borderRadius: 10,
    padding: '0.85rem 1.25rem',
    color: '#6ee7b7',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontWeight: 600,
  },
  trialCard: {
    background: 'rgba(245,158,11,0.08)',
    border: '1.5px solid rgba(245,158,11,0.3)',
    borderRadius: 14,
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  trialActive: {
    color: '#6ee7b7',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  trialBtn: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0.7rem 1.5rem',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid',
    borderRadius: 16,
    padding: '1.75rem',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s',
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '0.3rem 1rem',
    borderRadius: 20,
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: '1.35rem',
    fontWeight: 800,
    margin: '0 0 0.25rem',
    color: '#fff',
  },
  planDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.875rem',
    margin: '0 0 1.25rem',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.2rem',
    marginBottom: '1.25rem',
  },
  currency: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
  },
  price: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
  },
  period: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.45)',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    flex: 1,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.75)',
  },
  subscribeBtn: {
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '0.85rem',
    fontWeight: 800,
    fontSize: '1rem',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.85rem',
    marginTop: '1rem',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.85rem',
    marginBottom: '2rem',
    fontSize: '0.95rem',
  },
  toggleBtn: {
    position: 'relative',
    width: 48,
    height: 26,
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.25s',
    flexShrink: 0,
  },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.25s',
    display: 'block',
  },
  saveBadge: {
    display: 'inline-block',
    background: 'rgba(139,92,246,0.25)',
    color: '#c4b5fd',
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '0.15rem 0.5rem',
    borderRadius: 20,
    marginLeft: '0.35rem',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  annualNote: {
    margin: '-0.75rem 0 1rem',
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.4)',
  },
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: 'linear-gradient(145deg, #0f172a, #1e1b4b)',
    border: '1.5px solid rgba(99,91,255,0.35)',
    borderRadius: 20,
    padding: '2rem',
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#fff',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    padding: '0.4rem',
    display: 'flex',
    alignItems: 'center',
  },
};

const formStyles = {
  planSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
  },
  elementWrap: {
    marginBottom: '1.25rem',
  },
  error: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: 8,
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  payBtn: {
    width: '100%',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '0.9rem',
    fontWeight: 800,
    fontSize: '1.05rem',
    marginBottom: '0.75rem',
    boxShadow: '0 4px 20px rgba(99,91,255,0.4)',
    transition: 'opacity 0.2s',
  },
  cancelBtn: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '0.75rem',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  secureNote: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.78rem',
    margin: 0,
  },
  spinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};

const successStyles = {
  wrap: {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: 'rgba(16,185,129,0.08)',
    border: '1.5px solid rgba(16,185,129,0.3)',
    borderRadius: 20,
    padding: '3rem 2.5rem',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#fff',
    margin: '0 0 0.75rem',
  },
  sub: {
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  btn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '0.9rem 2rem',
    fontWeight: 800,
    fontSize: '1.05rem',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
  },
};
