const axios = require('axios');

// Stripe payment verification
async function verifyStripePayment(sessionId) {
  const STRIPE_SECRET = process.env.STRIPE_SECRET;
  const url = `https://api.stripe.com/v1/checkout/sessions/${sessionId}`;
  const headers = {
    Authorization: `Bearer ${STRIPE_SECRET}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const response = await axios.get(url, { headers });
  return response.data;
}

module.exports = {
  verifyStripePayment,
};
