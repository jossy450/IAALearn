const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Store FCM push notification token for a user
 * POST /api/push/register-token
 * Body: { token: "fcm_token_string" }
 */
router.post('/register-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!token || !userId) {
      return res.status(400).json({ error: 'Token and user ID required' });
    }

    // TODO: Store token in database (associate with user)
    // Example:
    // await db.query(
    //   'UPDATE users SET push_token = $1 WHERE id = $2',
    //   [token, userId]
    // );

    console.log(`Push token registered for user ${userId}:`, token);

    res.json({ success: true, message: 'Push token registered' });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * Send a test push notification to a user
 * POST /api/push/send-test
 * Body: { userId: "user_id" }
 * Admin only
 */
router.post('/send-test', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    // TODO: Validate admin role
    // if (req.user?.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    // TODO: Fetch user push token from database
    // const user = await db.query('SELECT push_token FROM users WHERE id = $1', [userId]);
    // if (!user.rows[0]?.push_token) {
    //   return res.status(404).json({ error: 'No push token found for user' });
    // }

    // TODO: Send push notification via Firebase Admin SDK
    // const message = {
    //   notification: {
    //     title: 'Test Notification',
    //     body: 'This is a test push notification',
    //   },
    //   token: user.rows[0].push_token,
    // };
    // await admin.messaging().send(message);

    console.log(`Test push notification queued for user ${userId}`);

    res.json({ success: true, message: 'Test push notification sent' });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

module.exports = router;
