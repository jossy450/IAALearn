const db = require('../database/connection');

// Get subscription status for user
async function getSubscriptionStatus(req, res) {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY end_date DESC LIMIT 1',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription status.' });
  }
}

// Start free trial for user
async function startTrial(req, res) {
  const userId = req.user.id;
  const now = new Date();
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h trial
  try {
    await db.query(
      `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method, trial_used)
       VALUES ($1, 'trial', 'active', $2, $3, 'trial', true)`,
      [userId, now, endDate]
    );
    res.json({ success: true, trialEnds: endDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start trial.' });
  }
}

// Create subscription after payment
const { verifyPaystackPayment, verifyPayPalPayment } = require('./payment');
const { verifyStripePayment } = require('./stripe');
const { verifyFlutterwavePayment } = require('./flutterwave');
const { verifyUKBankPayment, verifyCreditCardPayment } = require('./ukpayment');
async function createSubscription(req, res) {
  const userId = req.user.id;
  const { plan, payment_method, duration_days, paystack_reference, paypal_payment_id, paypal_access_token, stripe_session_id, flutterwave_tx_id, uk_bank_ref, credit_card_token } = req.body;
  const now = new Date();
  const endDate = new Date(now.getTime() + (duration_days || 30) * 24 * 60 * 60 * 1000);
  try {
    // Payment verification
    let paymentVerified = false;
    if (payment_method === 'paystack' && paystack_reference) {
      const result = await verifyPaystackPayment(paystack_reference);
      paymentVerified = result.status && result.data.status === 'success';
    } else if (payment_method === 'paypal' && paypal_payment_id && paypal_access_token) {
      const result = await verifyPayPalPayment(paypal_payment_id, paypal_access_token);
      paymentVerified = result.state === 'approved';
    } else if (payment_method === 'stripe' && stripe_session_id) {
      const result = await verifyStripePayment(stripe_session_id);
      paymentVerified = result.payment_status === 'paid';
    } else if (payment_method === 'flutterwave' && flutterwave_tx_id) {
      const result = await verifyFlutterwavePayment(flutterwave_tx_id);
      paymentVerified = result.status === 'success';
    } else if (payment_method === 'uk_bank' && uk_bank_ref) {
      const result = await verifyUKBankPayment(uk_bank_ref);
      paymentVerified = result.status === 'success';
    } else if (payment_method === 'credit_card' && credit_card_token) {
      const result = await verifyCreditCardPayment(credit_card_token);
      paymentVerified = result.status === 'success';
    } else {
      paymentVerified = false;
    }
    if (!paymentVerified) {
      return res.status(400).json({ error: 'Payment not verified.' });
    }
    await db.query(
      `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method, trial_used)
       VALUES ($1, $2, 'active', $3, $4, $5, false)`,
      [userId, plan, now, endDate, payment_method]
    );
    res.json({ success: true, subscriptionEnds: endDate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
}

// Cancel subscription
async function cancelSubscription(req, res) {
  const userId = req.user.id;
  try {
    await db.query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
}

module.exports = {
  getSubscriptionStatus,
  startTrial,
  createSubscription,
  cancelSubscription
};
