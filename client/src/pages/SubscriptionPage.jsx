import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Shield, Clock, Users, CreditCard, Smartphone, Globe, Gift } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [paystackRef, setPaystackRef] = useState('');
  const [paypalId, setPaypalId] = useState('');
  const [paypalToken, setPaypalToken] = useState('');
  const [stripeSessionId, setStripeSessionId] = useState('');
  const [flutterwaveTxId, setFlutterwaveTxId] = useState('');
  const [ukBankRef, setUkBankRef] = useState('');
  const [creditCardToken, setCreditCardToken] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState('');

  useEffect(() => {
    // Fetch available plans
    axios.get('/api/subscriptions/plans')
      .then(res => {
        setPlans(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load plans');
        setLoading(false);
      });
    // Fetch current subscription
    axios.get('/api/subscriptions/status')
      .then(res => setSubscription(res.data))
      .catch(() => setSubscription(null));
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(false);
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setTrialError('');
    try {
      const res = await axios.post('/api/subscriptions/trial');
      setSubscription(res.data);
      // Show success message
      setTrialError('Trial started successfully! Enjoy your free access.');
      setTimeout(() => setTrialError(''), 3000);
    } catch (err) {
      setTrialError('Failed to start trial. You may have already used your trial.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleSubscribe = () => {
    if (!selectedPlan) return;
    const body = { plan: selectedPlan.id, payment_method: paymentMethod };
    if (paymentMethod === 'paystack') body.paystack_reference = paystackRef;
    else if (paymentMethod === 'paypal') {
      body.paypal_payment_id = paypalId;
      body.paypal_access_token = paypalToken;
    }
    else if (paymentMethod === 'stripe') body.stripe_session_id = stripeSessionId;
    else if (paymentMethod === 'flutterwave') body.flutterwave_tx_id = flutterwaveTxId;
    else if (paymentMethod === 'uk_bank') body.uk_bank_ref = ukBankRef;
    else if (paymentMethod === 'credit_card') body.credit_card_token = creditCardToken;
    axios.post('/api/subscriptions/create', body)
      .then(res => {
        setSubscription(res.data);
        setShowPayment(false);
        setError('Subscription successful!');
        setTimeout(() => setError(''), 3000);
      })
      .catch(() => setError('Subscription failed. Please try again.'));
  };

  // Default plans if API fails
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
        'Basic analytics'
      ],
      popular: true,
      trial: true
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
        '3 document uploads per session'
      ],
      popular: false
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
        'Team collaboration'
      ],
      popular: true
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
        'SLA guarantee'
      ],
      popular: false
    }
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="subscription-page modern-ui">
      <div className="subscription-header">
        <h1>Subscription & Trial</h1>
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
            <div className="feature-item">
              <Check size={18} />
              <span>Unlimited AI-powered interview sessions</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Document analysis (CV, job descriptions)</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Mobile app access</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Real-time transcription</span>
            </div>
          </div>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleStartTrial}
            disabled={trialLoading || (subscription && subscription.status === 'trial')}
          >
            {trialLoading ? 'Starting...' : (subscription && subscription.status === 'trial' ? 'Trial Active' : 'Start 7-Day Free Trial')}
          </button>
          {trialError && (
            <div className={`alert ${trialError.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
              {trialError}
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
            <div className="detail-item">
              <strong>Plan:</strong> {subscription.plan || 'Free Trial'}
            </div>
            <div className="detail-item">
              <strong>Ends:</strong> {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
            </div>
            {subscription.status === 'trial' && (
              <div className="detail-item">
                <strong>Days Remaining:</strong> {subscription.days_remaining || '7'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="plans-section">
        <h2>Choose Your Plan</h2>
        <p className="section-subtitle">Upgrade for more features and better experience</p>
        
        {loading ? (
          <div className="loading">Loading plans...</div>
        ) : (
          <div className="plans-list">
            {displayPlans.map(plan => (
              <div 
                key={plan.id} 
                className={`plan-card ${selectedPlan && selectedPlan.id === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
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
                  {plan.features && plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <Check size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="plan-actions">
                  {plan.trial ? (
                    <button 
                      className="btn btn-primary" 
                      onClick={handleStartTrial}
                      disabled={trialLoading || (subscription && subscription.status === 'trial')}
                    >
                      {subscription && subscription.status === 'trial' ? 'Trial Active' : 'Start Trial'}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {selectedPlan && selectedPlan.id === plan.id ? 'Selected' : 'Select Plan'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Plan Details */}
      {selectedPlan && !selectedPlan.trial && (
        <div className="selected-plan-details card">
          <h3>Selected Plan: {selectedPlan.name}</h3>
          <div className="plan-summary">
            <p><strong>Description:</strong> {selectedPlan.description}</p>
            <p><strong>Price:</strong> ${selectedPlan.price} per {selectedPlan.duration}</p>
            <div className="feature-summary">
              <h4>Features included:</h4>
              <ul>
                {selectedPlan.features && selectedPlan.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setShowPayment(true)}>
            Proceed to Payment
          </button>
        </div>
      )}

      {/* Payment Section */}
      {showPayment && selectedPlan && (
        <div className="payment-section card">
          <h3>Payment Details</h3>
          <p>Complete your subscription for <strong>{selectedPlan.name}</strong> at ${selectedPlan.price}/{selectedPlan.duration}</p>
          
          <div className="payment-method">
            <label>Payment Method:</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="paystack">Paystack (Africa)</option>
              <option value="paypal">PayPal (Global)</option>
              <option value="stripe">Stripe (Global)</option>
              <option value="flutterwave">Flutterwave (Africa)</option>
              <option value="uk_bank">UK Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          <div className="payment-details">
            {paymentMethod === 'paystack' && (
              <div className="payment-field">
                <label>Paystack Reference:</label>
                <input 
                  type="text" 
                  value={paystackRef} 
                  onChange={e => setPaystackRef(e.target.value)} 
                  placeholder="Enter Paystack transaction reference"
                  required 
                />
              </div>
            )}
            {paymentMethod === 'paypal' && (
              <>
                <div className="payment-field">
                  <label>PayPal Payment ID:</label>
                  <input 
                    type="text" 
                    value={paypalId} 
                    onChange={e => setPaypalId(e.target.value)} 
                    placeholder="Enter PayPal payment ID"
                    required 
                  />
                </div>
                <div className="payment-field">
                  <label>PayPal Access Token:</label>
                  <input 
                    type="text" 
                    value={paypalToken} 
                    onChange={e => setPaypalToken(e.target.value)} 
                    placeholder="Enter PayPal access token"
                    required 
                  />
                </div>
              </>
            )}
            {paymentMethod === 'stripe' && (
              <div className="payment-field">
                <label>Stripe Session ID:</label>
                <input 
                  type="text" 
                  value={stripeSessionId} 
                  onChange={e => setStripeSessionId(e.target.value)} 
                  placeholder="Enter Stripe session ID"
                  required 
                />
              </div>
            )}
            {paymentMethod === 'flutterwave' && (
              <div className="payment-field">
                <label>Flutterwave Transaction ID:</label>
                <input 
                  type="text" 
                  value={flutterwaveTxId} 
                  onChange={e => setFlutterwaveTxId(e.target.value)} 
                  placeholder="Enter Flutterwave transaction ID"
                  required 
                />
              </div>
            )}
            {paymentMethod === 'uk_bank' && (
              <div className="payment-field">
                <label>UK Bank Reference:</label>
                <input 
                  type="text" 
                  value={ukBankRef} 
                  onChange={e => setUkBankRef(e.target.value)} 
                  placeholder="Enter UK bank transfer reference"
                  required 
                />
              </div>
            )}
            {paymentMethod === 'credit_card' && (
              <div className="payment-field">
                <label>Credit Card Token:</label>
                <input 
                  type="text" 
                  value={creditCardToken} 
                  onChange={e => setCreditCardToken(e.target.value)} 
                  placeholder="Enter credit card token"
                  required 
                />
              </div>
            )}
          </div>

          <div className="payment-actions">
            <button className="btn btn-primary" onClick={handleSubscribe}>
              Complete Subscription
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* FAQ Section */}
      <div className="faq-section card">
        <h3>Frequently Asked Questions</h3>
        <div className="faq-item">
          <h4>Can I cancel my subscription anytime?</h4>
          <p>Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
        </div>
        <div className="faq-item">
          <h4>What happens after my free trial ends?</h4>
          <p>After your 7-day free trial, you'll need to choose a paid plan to continue using premium features. Basic features will remain available.</p>
        </div>
        <div className="faq-item">
          <h4>Do you offer refunds?</h4>
          <p>We offer a 14-day money-back guarantee for all paid subscriptions if you're not satisfied with the service.</p>
        </div>
        <div className="faq-item">
          <h4>Can I switch plans?</h4>
          <p>Yes, you can upgrade or downgrade your plan at any time. The changes will take effect at your next billing cycle.</p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;