const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getSubscriptionStatus, startTrial, createSubscription, cancelSubscription } = require('../services/subscriptions');

// Get available subscription plans
router.get('/plans', authenticate, async (req, res) => {
  // Return predefined plans
  const plans = [
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
  res.json(plans);
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

module.exports = router;
