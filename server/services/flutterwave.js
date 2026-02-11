const axios = require('axios');

// Flutterwave payment verification
async function verifyFlutterwavePayment(txId) {
  const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET;
  const url = `https://api.flutterwave.com/v3/transactions/${txId}/verify`;
  const headers = {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
    'Content-Type': 'application/json',
  };
  const response = await axios.get(url, { headers });
  return response.data;
}

module.exports = {
  verifyFlutterwavePayment,
};
