const Stripe = require('stripe');

// Lazy-init so the server doesn't crash if STRIPE_SECRET is not set yet
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET) {
      throw new Error('STRIPE_SECRET environment variable is not set.');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-10-16' });
  }
  return _stripe;
}

// Price IDs per plan — map to your real Stripe Price IDs in .env
// or fall back to the plan amounts for one-time payments
const PLAN_PRICE_MAP = {
  basic:      process.env.STRIPE_PRICE_BASIC,
  pro:        process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

// Amount in pence/cents per plan (used when no Price ID is configured)
const PLAN_AMOUNT_MAP = {
  basic:      999,   // £9.99
  pro:        1999,  // £19.99
  enterprise: 4999,  // £49.99
};

/**
 * Create a Stripe Checkout Session and return its URL.
 * @param {object} opts
 * @param {string} opts.plan        - 'basic' | 'pro' | 'enterprise'
 * @param {string} opts.userId      - internal user ID (stored in metadata)
 * @param {string} opts.userEmail   - pre-fill customer email
 * @param {string} opts.successUrl  - redirect after successful payment
 * @param {string} opts.cancelUrl   - redirect if user cancels
 */
async function createCheckoutSession({ plan, userId, userEmail, successUrl, cancelUrl }) {
  const stripe = getStripe();
  const priceId = PLAN_PRICE_MAP[plan];

  let sessionParams;

  if (priceId) {
    // Use a pre-configured recurring Stripe Price (subscription mode)
    sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      metadata: { userId, plan },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
  } else {
    // Fallback: one-time payment using amount
    const amount = PLAN_AMOUNT_MAP[plan] || 999;
    const planLabels = { basic: 'Basic Plan', pro: 'Professional Plan', enterprise: 'Enterprise Plan' };
    sessionParams = {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: amount,
            product_data: { name: planLabels[plan] || plan },
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: { userId, plan },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
}

/**
 * Retrieve a Checkout Session by ID to verify payment status.
 */
async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'subscription'],
  });
}

/**
 * Verify a Stripe webhook signature and return the event.
 */
function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Create a PaymentIntent for embedded Stripe Elements (modal flow).
 */
async function createPaymentIntent({ amount, currency = 'gbp', metadata = {}, description = '' }) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount,
    currency,
    metadata,
    description,
    automatic_payment_methods: { enabled: true },
  });
}

/**
 * Retrieve a PaymentIntent by ID to verify its status.
 */
async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

// Legacy helper kept for backward compatibility
async function verifyStripePayment(sessionId) {
  const session = await retrieveCheckoutSession(sessionId);
  return session;
}

module.exports = {
  createCheckoutSession,
  retrieveCheckoutSession,
  constructWebhookEvent,
  createPaymentIntent,
  retrievePaymentIntent,
  verifyStripePayment,
};
