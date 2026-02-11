import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SubscriptionPage.css';
import './SubscriptionPageModern.css';

function SubscriptionPage() {
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
      .then(res => setSubscription(res.data))
      .catch(() => setError('Subscription failed'));
  };

  return (
    <div className="subscription-page modern-ui">
      <div className="subscription-header">
        <h1>Choose Your Subscription</h1>
        <p>Compare plans and select the best for you. Enjoy fast, easy payment with local banks and credit cards.</p>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="plans-list">
          {plans.map(plan => (
            <div key={plan.id} className={`plan-card ${selectedPlan && selectedPlan.id === plan.id ? 'selected' : ''}`}>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <p><b>Price:</b> ${plan.price} / {plan.duration}</p>
              <ul className="plan-features">
                {plan.features && plan.features.map((f, idx) => <li key={idx}>{f}</li>)}
              </ul>
              <button className="btn btn-primary" onClick={() => handleSelectPlan(plan)}>Select</button>
            </div>
          ))}
        </div>
      )}
      {selectedPlan && (
        <div className="compare-section">
          <h3>Selected Plan: {selectedPlan.name}</h3>
          <div className="compare-details">
            <p>{selectedPlan.description}</p>
            <ul>
              {selectedPlan.features && selectedPlan.features.map((f, idx) => <li key={idx}>{f}</li>)}
            </ul>
            <p><b>Price:</b> ${selectedPlan.price} / {selectedPlan.duration}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPayment(true)}>Proceed to Payment</button>
        </div>
      )}
      {showPayment && (
        <div className="payment-section">
          <h3>Payment Options</h3>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="paystack">Paystack</option>
            <option value="paypal">PayPal</option>
            <option value="stripe">Stripe</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="uk_bank">UK Local Bank</option>
            <option value="credit_card">Credit Card</option>
          </select>
          {paymentMethod === 'paystack' && (
            <div>
              <label>Paystack Reference:</label>
              <input type="text" value={paystackRef} onChange={e => setPaystackRef(e.target.value)} required />
            </div>
          )}
          {paymentMethod === 'paypal' && (
            <div>
              <label>PayPal Payment ID:</label>
              <input type="text" value={paypalId} onChange={e => setPaypalId(e.target.value)} required />
              <label>PayPal Access Token:</label>
              <input type="text" value={paypalToken} onChange={e => setPaypalToken(e.target.value)} required />
            </div>
          )}
          {paymentMethod === 'stripe' && (
            <div>
              <label>Stripe Session ID:</label>
              <input type="text" value={stripeSessionId} onChange={e => setStripeSessionId(e.target.value)} required />
            </div>
          )}
          {paymentMethod === 'flutterwave' && (
            <div>
              <label>Flutterwave Transaction ID:</label>
              <input type="text" value={flutterwaveTxId} onChange={e => setFlutterwaveTxId(e.target.value)} required />
            </div>
          )}
          {paymentMethod === 'uk_bank' && (
            <div>
              <label>UK Bank Reference:</label>
              <input type="text" value={ukBankRef} onChange={e => setUkBankRef(e.target.value)} required />
            </div>
          )}
          {paymentMethod === 'credit_card' && (
            <div>
              <label>Credit Card Token:</label>
              <input type="text" value={creditCardToken} onChange={e => setCreditCardToken(e.target.value)} required />
            </div>
          )}
          <button className="btn btn-primary" onClick={handleSubscribe}>Subscribe</button>
          <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
        </div>
      )}
      {subscription && (
        <div className="current-subscription">
          <h3>Your Subscription</h3>
          <p>Status: {subscription.status}</p>
          <p>Plan: {subscription.plan}</p>
          <p>Ends: {subscription.end_date ? new Date(subscription.end_date).toLocaleString() : 'N/A'}</p>
        </div>
      )}
      {error && <div className="alert-error">{error}</div>}
    </div>
  );
}

export default SubscriptionPage;
