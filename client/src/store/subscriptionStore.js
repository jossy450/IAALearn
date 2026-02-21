/**
 * subscriptionStore.js
 * Central source of truth for plan definitions and feature-gate helpers.
 * Used by both the SubscriptionPage and any component that needs to check
 * what the current user is allowed to do.
 */

// ── Plan hierarchy (order matters — higher index = higher tier) ───────────────
export const PLAN_ORDER = ['trial', 'basic', 'pro', 'enterprise'];

/**
 * Returns true if `userPlan` meets or exceeds `requiredPlan`.
 * e.g. canAccess('pro', 'basic') === true
 *      canAccess('basic', 'pro') === false
 */
export function canAccess(userPlan, requiredPlan) {
  const userIdx     = PLAN_ORDER.indexOf(userPlan);
  const requiredIdx = PLAN_ORDER.indexOf(requiredPlan);
  if (userIdx === -1 || requiredIdx === -1) return false;
  return userIdx >= requiredIdx;
}

/**
 * Feature limits per plan.
 * Components should import this and check against the user's current plan.
 */
export const PLAN_LIMITS = {
  trial: {
    maxDocUploadsPerSession: 3,
    unlimitedDocUploads:     false,
    advancedAnalytics:       false,
    sessionRecording:        false,
    customAI:                false,
    sessionExport:           false,
    stealthMode:             false,
    mobileApp:               false,
    teamCollaboration:       false,
    apiAccess:               false,
    prioritySupport:         false,
    dedicatedManager:        false,
  },
  basic: {
    maxDocUploadsPerSession: 3,
    unlimitedDocUploads:     false,
    advancedAnalytics:       false,   // moved to Pro
    sessionRecording:        false,
    customAI:                false,
    sessionExport:           false,
    stealthMode:             true,    // Stealth is the Basic differentiator
    mobileApp:               true,    // Mobile access from Basic+
    teamCollaboration:       false,
    apiAccess:               false,
    prioritySupport:         false,
    dedicatedManager:        false,
  },
  pro: {
    maxDocUploadsPerSession: Infinity,
    unlimitedDocUploads:     true,
    advancedAnalytics:       true,
    sessionRecording:        true,
    customAI:                true,
    sessionExport:           true,
    stealthMode:             true,
    mobileApp:               true,
    teamCollaboration:       false,   // moved to Enterprise
    apiAccess:               false,
    prioritySupport:         true,
    dedicatedManager:        false,
  },
  enterprise: {
    maxDocUploadsPerSession: Infinity,
    unlimitedDocUploads:     true,
    advancedAnalytics:       true,
    sessionRecording:        true,
    customAI:                true,
    sessionExport:           true,
    stealthMode:             true,
    mobileApp:               true,
    teamCollaboration:       true,
    apiAccess:               true,
    prioritySupport:         true,
    dedicatedManager:        true,
  },
};

/**
 * Returns the limits object for a given plan (falls back to trial limits).
 */
export function getLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
}
