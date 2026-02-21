const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getSubscriptionStatus, startTrial, createSubscription, cancelSubscription } = require('../services/subscriptions');
const { createCheckoutSession, retrieveCheckoutSession, constructWebhookEvent } = require('../services/stripe');
const db = require('../database/connection');

// ── Plan limits (mirrors client/src/store/subscriptionStore.js) ───────────────
const PLAN_LIMITS = {
  trial:      { maxDocUploadsPerSession: 3, unlimitedDocUploads: false, advancedAnalytics: false, sessionRecording: false, customAI: false, sessionExport: false, stealthMode: false, mobileApp: false, teamCollaboration: false, apiAccess: false },
  basic:      { maxDocUploadsPerSession: 3, unlimitedDocUploads: false, advancedAnalytics: false, sessionRecording: false, customAI: false, sessionExport: false, stealthMode: true,  mobileApp: true,  teamCollaboration: false, apiAccess: false },
  pro:        { maxDocUploadsPerSession: Infinity, unlimitedDocUploads: true, advancedAnalytics: true, sessionRecording: true, customAI: true, sessionExport: true, stealthMode: true, mobileApp: true, teamCollaboration: false, apiAccess: false },
  enterprise: { maxDocUploadsPerSession: Infinity, unlimitedDocUploads: true, advancedAnalytics: true, sessionRecording: true, customAI: true, sessionExport: true, stealthMode: true, mobileApp: true, teamCollaboration: true,  apiAccess: true  },
};

// Get available subscription plans
router.get('/plans', authenticate, async (req, res) => {
  const plans = [
    {
      id: 'trial',
      name: 'Free Trial',
      description: 'Try all features for 7 days',
      monthlyPrice: 0,
      annualPrice: 0,
      currency: '£',
      duration: '7 days',
      features: [
        'Unlimited AI interview sessions',
        'Priority AI responses',
        'Email support',
        '3 document uploads per session',
      ],
      trial: true,
      limits: PLAN_LIMITS.trial,
    },
    {
      id: 'basic',
      name: 'Essentials',
      description: 'Perfect for individual job seekers',
      monthlyPrice: 9.99,
      annualPrice: 99,
      currency: '£',
      duration: 'month',
      features: [
        'Unlimited AI interview sessions',
        'Priority AI responses',
        'Email support',
        '3 document uploads per session',
        'Stealth mode access',
        'Mobile app access',
      ],
      popular: false,
      limits: PLAN_LIMITS.basic,
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'For serious job seekers',
      monthlyPrice: 19.99,
      annualPrice: 199,
      currency: '£',
      duration: 'month',
      features: [
        'Everything in Essentials',
        'Unlimited document uploads',
        'Advanced analytics',
        'Session recording & playback',
        'Custom AI instructions',
        'Session history export',
        'Priority support',
      ],
      popular: true,
      limits: PLAN_LIMITS.pro,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams and organisations',
      monthlyPrice: 49.99,
      annualPrice: 499,
      currency: '£',
      duration: 'month',
      features: [
        'Everything in Professional',
        'Team collaboration',
        'Team management dashboard',
        'Custom branding',
        'API access',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      popular: false,
      limits: PLAN_LIMITS.enterprise,
    },
  ];
  res.json(plans);
});

// GET /api/subscriptions/limits — returns feature limits for the current user's plan
router.get('/limits', authenticate, async (req, res) => {
  try {
    let plan = 'trial';
    if (process.env.DEMO_MODE !== 'true') {
      const result = await db.query(
        `SELECT plan FROM subscriptions WHERE user_id = $1 AND status IN ('active','trial') ORDER BY start_date DESC LIMIT 1`,
        [req.user.id]
      );
      if (result.rows.length > 0) plan = result.rows[0].plan;
    }
    res.json({ plan, limits: PLAN_LIMITS[plan] || PLAN_LIMITS.trial });
  } catch (err) {
    res.json({ plan: 'trial', limits: PLAN_LIMITS.trial });
  }
});

// Get current user's subscription status
router.get('/status', authenticate, getSubscriptionStatus);

// Start free trial for user
router.post('/trial', authenticate, startTrial);

// Create a new subscription (after payment)
router.post('/create', authenticate, createSubscription);

// Cancel subscription
router.post('/cancel', authenticate, cancelSubscription);

// Payment history endpoint
router.get('/history', authenticate, async (req, res) => {
	// In demo mode the user id may be a non-UUID string (eg. 'demo-user-1').
	// Avoid DB queries in demo mode to prevent UUID cast errors and return
	// an empty history or a small mocked response.
	if (process.env.DEMO_MODE === 'true') {
		return res.json([]);
	}

	const db = require('../database/connection');
	const userId = req.user.id;
	try {
		const result = await db.query(
			'SELECT start_date AS date, payment_method AS method, plan, status, end_date, (end_date - start_date) AS duration, 0 AS amount FROM subscriptions WHERE user_id = $1 ORDER BY start_date DESC LIMIT 20',
			[userId]
		);
		res.json(result.rows);
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch payment history." });
	}
});

// ─── Stripe PaymentIntent (embedded modal flow) ───────────────────────────────

/**
 * POST /api/subscriptions/stripe/create-payment-intent
 * Creates a PaymentIntent and returns the clientSecret for the frontend
 * Stripe Elements to collect card details directly in the page.
 */
router.post('/stripe/create-payment-intent', authenticate, async (req, res) => {
  const { plan } = req.body;
  const PLAN_AMOUNTS = { basic: 999, pro: 1999, enterprise: 4999 }; // pence (GBP)
  const PLAN_LABELS  = { basic: 'Basic Plan', pro: 'Professional Plan', enterprise: 'Enterprise Plan' };

  if (!PLAN_AMOUNTS[plan]) {
    return res.status(400).json({ error: 'Invalid plan. Must be basic, pro, or enterprise.' });
  }

  try {
    const { createPaymentIntent } = require('../services/stripe');
    const intent = await createPaymentIntent({
      amount:   PLAN_AMOUNTS[plan],
      currency: 'gbp',
      metadata: { userId: String(req.user.id), plan },
      description: PLAN_LABELS[plan],
    });
    res.json({ clientSecret: intent.client_secret, amount: PLAN_AMOUNTS[plan], plan });
  } catch (err) {
    console.error('PaymentIntent error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create payment intent.' });
  }
});

/**
 * POST /api/subscriptions/stripe/confirm-payment
 * Called after frontend confirms payment — activates subscription in DB.
 */
router.post('/stripe/confirm-payment', authenticate, async (req, res) => {
  const { paymentIntentId, plan } = req.body;
  if (!paymentIntentId || !plan) {
    return res.status(400).json({ error: 'paymentIntentId and plan are required.' });
  }
  try {
    const { retrievePaymentIntent } = require('../services/stripe');
    const intent = await retrievePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: `Payment not succeeded. Status: ${intent.status}` });
    }
    if (process.env.DEMO_MODE !== 'true') {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method, trial_used)
         VALUES ($1, $2, 'active', $3, $4, 'stripe', false)`,
        [req.user.id, plan, now, endDate]
      ).catch(e => console.warn('confirm-payment insert warning:', e.message));
    }
    res.json({ success: true, plan, message: 'Subscription activated!' });
  } catch (err) {
    console.error('confirm-payment error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to confirm payment.' });
  }
});

// ─── Stripe Checkout (redirect flow — kept as fallback) ───────────────────────

/**
 * POST /api/subscriptions/stripe/create-checkout-session
 * Creates a Stripe Checkout Session and returns the URL to redirect the user to.
 */
router.post('/stripe/create-checkout-session', authenticate, async (req, res) => {
  const { plan } = req.body;
  const validPlans = ['basic', 'pro', 'enterprise'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Must be basic, pro, or enterprise.' });
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const successUrl = `${clientUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${clientUrl}/subscription?cancelled=1`;

  try {
    const session = await createCheckoutSession({
      plan,
      userId:    req.user.id,
      userEmail: req.user.email,
      successUrl,
      cancelUrl,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout session error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create Stripe checkout session.' });
  }
});

/**
 * GET /api/subscriptions/stripe/session-status?session_id=xxx
 * Verifies a completed Stripe Checkout Session and activates the subscription.
 */
router.get('/stripe/session-status', authenticate, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required.' });

  try {
    const session = await retrieveCheckoutSession(session_id);

    // Verify the session belongs to this user
    if (session.metadata?.userId && session.metadata.userId !== String(req.user.id)) {
      return res.status(403).json({ error: 'Session does not belong to this user.' });
    }

    const paid = session.payment_status === 'paid' || session.status === 'complete';

    if (paid && process.env.DEMO_MODE !== 'true') {
      const plan = session.metadata?.plan || 'basic';
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Upsert subscription — avoid duplicate if webhook already handled it
      await db.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method, trial_used)
         VALUES ($1, $2, 'active', $3, $4, 'stripe', false)
         ON CONFLICT DO NOTHING`,
        [req.user.id, plan, now, endDate]
      ).catch(() => {
        // If ON CONFLICT not supported, just insert (idempotent enough for our use)
        return db.query(
          `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method, trial_used)
           VALUES ($1, $2, 'active', $3, $4, 'stripe', false)`,
          [req.user.id, plan, now, endDate]
        );
      });
    }

    res.json({
      status: session.status,
      payment_status: session.payment_status,
      plan: session.metadata?.plan,
      customer_email: session.customer_email || session.customer_details?.email,
      paid,
    });
  } catch (err) {
    console.error('Stripe session status error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to retrieve session status.' });
  }
});

/**
 * POST /api/subscriptions/stripe/webhook
 * Stripe sends events here. Must be registered in Stripe Dashboard.
 * Use raw body — do NOT parse as JSON before this route.
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paid = session.payment_status === 'paid';
      if (paid && process.env.DEMO_MODE !== 'true') {
        const userId = session.metadata?.userId;
        const plan   = session.metadata?.plan || 'basic';
        if (userId) {
          const now = new Date();
          const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await db.query(
            `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, payment_method, trial_used)
             VALUES ($1, $2, 'active', $3, $4, 'stripe', false)`,
            [userId, plan, now, endDate]
          ).catch(e => console.warn('Webhook subscription insert warning:', e.message));
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      if (process.env.DEMO_MODE !== 'true') {
        await db.query(
          `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
           WHERE payment_method = 'stripe' AND status = 'active'
           AND user_id IN (
             SELECT user_id FROM subscriptions WHERE payment_method = 'stripe' LIMIT 1
           )`
        ).catch(e => console.warn('Webhook cancel warning:', e.message));
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  res.json({ received: true });
});

module.exports = router;
