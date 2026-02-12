const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getSubscriptionStatus, startTrial, createSubscription, cancelSubscription } = require('../services/subscriptions');

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
