const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

/**
 * Configure Passport with Google and GitHub OAuth strategies
 */
function configurePassport() {
  const baseServerUrl = (
    process.env.SERVER_URL || 
    process.env.RENDER_EXTERNAL_URL || 
    process.env.PUBLIC_SERVER_URL || 
    process.env.PUBLIC_URL || 
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const mask = (s = '') => {
    if (!s) return '';
    const keep = 6;
    return s.length > keep * 2 ? `${s.slice(0, keep)}...${s.slice(-keep)}` : `${s.slice(0, 4)}...`;
  };

  // Helpful startup logs for debugging OAuth configuration
  console.log('📍 Passport base server URL:', baseServerUrl);
  const configuredClient = process.env.GOOGLE_CLIENT_ID || null;
  if (configuredClient) console.log('🔐 GOOGLE_CLIENT_ID configured:', mask(configuredClient));

  // Google OAuth Strategy
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleId || !googleSecret) {
    console.warn('⚠️  Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    // In production we want to fail fast so misconfiguration is caught early
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Fatal: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in production. Exiting.');
      // Allow a short delay for logs to flush in some environments then exit
      setTimeout(() => process.exit(1), 200);
      return;
    }
  }

  if (googleId && googleSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: `${baseServerUrl}/api/auth/google/callback`,
          proxy: true
        },
        (accessToken, refreshToken, profile, done) => {
          // Pass the profile to the route handler
          return done(null, profile);
        }
      )
    );
    console.log('✅ Google OAuth strategy configured');
    console.log('🔗 Google callback URL:', `${baseServerUrl}/api/auth/google/callback`);
  } else {
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${baseServerUrl}/api/auth/github/callback`,
          proxy: true
        },
        (accessToken, refreshToken, profile, done) => {
          // Pass the profile to the route handler
          return done(null, profile);
        }
      )
    );
    console.log('✅ GitHub OAuth strategy configured');
  } else {
    console.log('⚠️  GitHub OAuth not configured - missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
  }

  // Passport serialization (not used with JWT but required by passport)
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}

module.exports = { configurePassport };
