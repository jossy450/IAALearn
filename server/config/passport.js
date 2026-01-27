const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

/**
 * Configure Passport with Google and GitHub OAuth strategies
 */
function configurePassport() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/google/callback`,
          proxy: true
        },
        (accessToken, refreshToken, profile, done) => {
          // Pass the profile to the route handler
          return done(null, profile);
        }
      )
    );
    console.log('✅ Google OAuth strategy configured');
  } else {
    console.log('⚠️  Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/auth/github/callback`,
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
