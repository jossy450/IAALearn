const axios = require('axios');

// Paystack payment verification
async function verifyPaystackPayment(reference) {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
  const url = `https://api.paystack.co/transaction/verify/${reference}`;
  const headers = {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    'Content-Type': 'application/json',
  };
  const response = await axios.get(url, { headers });
  return response.data;
}

// PayPal payment verification
async function verifyPayPalPayment(paymentId, accessToken) {
  const url = `https://api.paypal.com/v1/payments/payment/${paymentId}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  const response = await axios.get(url, { headers });
  return response.data;
}

module.exports = {
  verifyPaystackPayment,
  verifyPayPalPayment,
};
