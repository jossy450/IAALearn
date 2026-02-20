import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Gift } from 'lucide-react';
import './SubscriptionPage.css';
import './SubscriptionPageModern.css';

function SubscriptionPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [paystackRef, setPaystackRef] = useState('');
  const [paypalId, setPaypalId] = useState('');
  const [paypalToken, setPaypalToken] = useState('');
  const [flutterwaveTxId, setFlutterwaveTxId] = useState('');
  const [ukBankRef, setUkBankRef] = useState('');
  const [creditCardToken, setCreditCardToken] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialMessage, setTrialMessage] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');

  useEffect(() => {
    api.get('/subscriptions/plans')
      .then(res => { setPlans(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });

    api.get('/subscriptions/status')
      .then(res => setSubscription(res.data))
      .catch(() => setSubscription(null));
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(false);
    setStripeError('');
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setTrialMessage('');
    try {
      const res = await api.post('/subscriptions/trial');
      setSubscription(res.data);
      setTrialMessage('✅ Trial started successfully! Enjoy your free access.');
      setTimeout(() => setTrialMessage(''), 4000);
    } catch (err) {
      setTrialMessage('❌ Failed to start trial. You may have already used your trial.');
    } finally {
      setTrialLoading(false);
    }
  };

  // ── Stripe: create checkout session and redirect to Stripe-hosted page ──
  const handleStripeCheckout = async (planId) => {
    setStripeLoading(true);
    setStripeError('');
    try {
      const res = await api.post('/subscriptions/stripe/create-checkout-session', { plan: planId });
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        setStripeError('No checkout URL returned. Please try again.');
        setStripeLoading(false);
      }
    } catch (err) {
      setStripeError(
        err?.response?.data?.error ||
        err.message ||
        'Failed to start Stripe checkout. Please try again.'
      );
      setStripeLoading(false);
    }
  };

  const handleSubscribe = () => {
    if (!selectedPlan) return;
    if (paymentMethod === 'stripe') {
      handleStripeCheckout(selectedPlan.id);
      return;
    }
    const body = { plan: selectedPlan.id, payment_method: paymentMethod };
    if (paymentMethod === 'paystack') body.paystack_reference = paystackRef;
    else if (paymentMethod === 'paypal') {
      body.paypal_payment_id = paypalId;
      body.paypal_access_token = paypalToken;
    } else if (paymentMethod === 'flutterwave') body.flutterwave_tx_id = flutterwaveTxId;
    else if (paymentMethod === 'uk_bank') body.uk_bank_ref = ukBankRef;
    else if (paymentMethod === 'credit_card') body.credit_card_token = creditCardToken;

    api.post('/subscriptions/create', body)
      .then(res => {
        setSubscription(res.data);
        setShowPayment(false);
        setError('✅ Subscription successful!');
        setTimeout(() => setError(''), 3000);
      })
      .catch(() => setError('❌ Subscription failed. Please try again.'));
  };

  const defaultPlans = [
    {
      id: 'trial',
      name: 'Free Trial',
      description: 'Try all features for free',
      price: 0,
      duration: '7 days',
      features: [
        'Full access to all AI features',
        'Unlimited interview sessions',
        'Document upload support',
        'Mobile app access',
        'Basic analytics',
      ],
      popular: true,
      trial: true,
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Perfect for individual users',
      price: 9.99,
      duration: 'month',
      features: [
        'All trial features',
        'Priority AI responses',
        'Advanced analytics',
        'Email support',
        '3 document uploads per session',
      ],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'For serious job seekers',
      price: 19.99,
      duration: 'month',
      features: [
        'All basic features',
        'Unlimited document uploads',
        'Priority support',
        'Custom AI instructions',
        'Session history export',
        'Team collaboration',
      ],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams and organizations',
      price: 49.99,
      duration: 'month',
      features: [
        'All professional features',
        'Team management dashboard',
        'Custom branding',
        'API access',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      popular: false,
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="subscription-page modern-ui">
      <div className="subscription-header">
        <h1>Subscription &amp; Trial</h1>
        <p className="subtitle">Choose the perfect plan for your interview preparation journey</p>
      </div>

      {/* Trial Section */}
      {(!subscription || subscription.status === 'inactive' || subscription.status === 'trial') && (
        <div className="trial-section card">
          <div className="trial-header">
            <Gift size={32} className="trial-icon" />
            <h2>Start Your Free Trial</h2>
          </div>
          <p className="trial-description">
            Get full access to all premium features for 7 days. No credit card required.
          </p>
          <div className="trial-features">
            {['Unlimited AI-powered interview sessions', 'Document analysis (CV, job descriptions)', 'Mobile app access', 'Real-time transcription'].map(f => (
              <div className="feature-item" key={f}>
                <Check size={18} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleStartTrial}
            disabled={trialLoading || (subscription && subscription.status === 'trial')}
          >
            {trialLoading ? 'Starting…' : subscription?.status === 'trial' ? 'Trial Active' : 'Start 7-Day Free Trial'}
          </button>
          {trialMessage && (
            <div className={`alert ${trialMessage.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '1rem' }}>
              {trialMessage}
            </div>
          )}
        </div>
      )}

      {/* Current Subscription Status */}
      {subscription && subscription.status !== 'inactive' && (
        <div className="current-subscription card">
          <h3>Your Current Subscription</h3>
          <div className="subscription-details">
            <div className="detail-item">
              <strong>Status:</strong>
              <span className={`status-badge ${subscription.status}`}>
                {subscription.status === 'trial' ? 'Free Trial' : subscription.status}
              </span>
            </div>
            <div className="detail-item"><strong>Plan:</strong> {subscription.plan || 'Free Trial'}</div>
            <div className="detail-item">
              <strong>Ends:</strong> {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
            </div>
            {subscription.status === 'trial' && (
              <div className="detail-item"><strong>Days Remaining:</strong> {subscription.days_remaining || '7'}</div>
            )}
          </div>
        </div>
      )}

      {/* Stripe error banner (shown when checkout fails from plan card) */}
      {stripeError && (
        <div className="alert alert-error" style={{ margin: '0 0 1rem' }}>{stripeError}</div>
      )}

      {/* Subscription Plans */}
      <div className="plans-section">
        <h2>Choose Your Plan</h2>
        <p className="section-subtitle">Upgrade for more features and better experience</p>

        {loading ? (
          <div className="loading">Loading plans…</div>
        ) : (
          <div className="plans-list">
            {displayPlans.map(plan => (
              <div
                key={plan.id}
                className={`plan-card ${selectedPlan?.id === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                {plan.trial && <div className="trial-badge">Free</div>}

                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <div className="plan-price">
                    <span className="price">${plan.price}</span>
                    <span className="duration">/{plan.duration}</span>
                  </div>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <ul className="plan-features">
                  {plan.features?.map((feature, idx) => (
                    <li key={idx}><Check size={16} />{feature}</li>
                  ))}
                </ul>

                <div className="plan-actions">
                  {plan.trial ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleStartTrial}
                      disabled={trialLoading || subscription?.status === 'trial'}
                    >
                      {subscription?.status === 'trial' ? 'Trial Active' : 'Start Trial'}
                    </button>
                  ) : (
                    <>
                      {/* Primary: direct Stripe checkout */}
                      <button
                        onClick={() => handleStripeCheckout(plan.id)}
                        disabled={stripeLoading}
                        style={{
                          background: 'linear-gradient(135deg, #635bff 0%, #7c3aed 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.65rem 1.2rem',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: stripeLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          justifyContent: 'center',
                          boxShadow: '0 4px 15px rgba(99,91,255,0.35)',
                          opacity: stripeLoading ? 0.7 : 1,
                          marginBottom: '0.5rem',
                        }}
                      >
                        <CreditCard size={16} />
                        {stripeLoading ? 'Redirecting…' : '🔒 Pay with Stripe'}
                      </button>
                      {/* Secondary: other payment methods */}
                      <button
                        className="btn btn-secondary"
                        onClick={() => { handleSelectPlan(plan); setShowPayment(true); }}
                        style={{ width: '100%' }}
                      >
                        Other payment methods
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Payment Methods Section */}
      {showPayment && selectedPlan && !selectedPlan.trial && (
        <div className="payment-section card">
          <h3>Payment Details — {selectedPlan.name}</h3>
          <p>
            Complete your subscription at <strong>${selectedPlan.price}/{selectedPlan.duration}</strong>
          </p>

          <div className="payment-method">
            <label>Payment Method:</label>
            <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setStripeError(''); }}>
              <option value="stripe">Stripe (Global) — Recommended</option>
              <option value="paystack">Paystack (Africa)</option>
              <option value="paypal">PayPal (Global)</option>
              <option value="flutterwave">Flutterwave (Africa)</option>
              <option value="uk_bank">UK Bank Transfer</option>
              <option value="credit_card">Credit Card Token</option>
            </select>
          </div>

          <div className="payment-details">
            {paymentMethod === 'stripe' && (
              <div className="payment-field">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <CreditCard size={24} style={{ color: '#818cf8', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#c7d2fe', display: 'block', marginBottom: '0.25rem' }}>Secure Stripe Checkout</strong>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                      You'll be redirected to Stripe's secure payment page.
                    </span>
                  </div>
                </div>
              </div>
            )}
            {paymentMethod === 'paystack' && (
              <div className="payment-field">
                <label>Paystack Reference:</label>
                <input type="text" value={paystackRef} onChange={e => setPaystackRef(e.target.value)} placeholder="Enter Paystack transaction reference" />
              </div>
            )}
            {paymentMethod === 'paypal' && (
              <>
                <div className="payment-field">
                  <label>PayPal Payment ID:</label>
                  <input type="text" value={paypalId} onChange={e => setPaypalId(e.target.value)} placeholder="Enter PayPal payment ID" />
                </div>
                <div className="payment-field">
                  <label>PayPal Access Token:</label>
                  <input type="text" value={paypalToken} onChange={e => setPaypalToken(e.target.value)} placeholder="Enter PayPal access token" />
                </div>
              </>
            )}
            {paymentMethod === 'flutterwave' && (
              <div className="payment-field">
                <label>Flutterwave Transaction ID:</label>
                <input type="text" value={flutterwaveTxId} onChange={e => setFlutterwaveTxId(e.target.value)} placeholder="Enter Flutterwave transaction ID" />
              </div>
            )}
            {paymentMethod === 'uk_bank' && (
              <div className="payment-field">
                <label>UK Bank Reference:</label>
                <input type="text" value={ukBankRef} onChange={e => setUkBankRef(e.target.value)} placeholder="Enter UK bank transfer reference" />
              </div>
            )}
            {paymentMethod === 'credit_card' && (
              <div className="payment-field">
                <label>Credit Card Token:</label>
                <input type="text" value={creditCardToken} onChange={e => setCreditCardToken(e.target.value)} placeholder="Enter credit card token" />
              </div>
            )}
          </div>

          {stripeError && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{stripeError}</div>
          )}

          <div className="payment-actions">
            <button
              className="btn btn-primary"
              onClick={handleSubscribe}
              disabled={paymentMethod === 'stripe' && stripeLoading}
              style={paymentMethod === 'stripe' ? {
                background: 'linear-gradient(135deg, #635bff 0%, #7c3aed 100%)',
                boxShadow: '0 4px 15px rgba(99,91,255,0.35)',
              } : {}}
            >
              {paymentMethod === 'stripe'
                ? (stripeLoading ? 'Redirecting to Stripe…' : '🔒 Pay with Stripe')
                : 'Complete Subscription'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* General error/success */}
      {error && (
        <div className={`alert ${error.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
          {error}
        </div>
      )}

      {/* FAQ */}
      <div className="faq-section card">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-item">
          <h4>Can I cancel my subscription anytime?</h4>
          <p>Yes, you can cancel at any time. Your access continues until the end of your billing period.</p>
        </div>
        <div className="faq-item">
          <h4>What happens after my free trial ends?</h4>
          <p>After 7 days, choose a paid plan to continue using premium features.</p>
        </div>
        <div className="faq-item">
          <h4>Do you offer refunds?</h4>
          <p>We offer a 14-day money-back guarantee for all paid subscriptions.</p>
        </div>
        <div className="faq-item">
          <h4>Can I switch plans?</h4>
          <p>Yes, upgrade or downgrade at any time. Changes take effect at your next billing cycle.</p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;
