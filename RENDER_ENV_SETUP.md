# Environment Variables Configuration for Render Deployment

## Required Environment Variables

Add these environment variables in your Render dashboard (Settings > Environment):

### Database Configuration

```bash
# Supabase PostgreSQL Connection
# IMPORTANT: Use the connection pooler URL (port 6543) instead of direct connection (port 5432)
# This fixes the IPv6 ENETUNREACH error
DATABASE_URL=postgresql://postgres.[your-project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Alternative: Use IPv4-only Supabase endpoint
# DATABASE_URL=postgresql://postgres.[your-project-ref]:[password]@db.[your-project-ref].supabase.co:5432/postgres?sslmode=require

# For forcing IPv4 resolution, you can also set:
DB_HOST=db.[your-project-ref].supabase.co
```

### JWT Secret

```bash
# Generate a secure random string (minimum 32 characters)
JWT_SECRET=your_super_secure_random_string_here_min_32_chars
```

### Server Configuration

```bash
# Your Render service URL
SERVER_URL=https://iaalearn.onrender.com

# Your client URL (same as server URL if serving from same instance)
CLIENT_URL=https://iaalearn.onrender.com

# Environment
NODE_ENV=production
```

### Google OAuth (Optional)

To enable Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials >  
5. Application type: Web application
6. Authorized redirect URIs:
   - `https://iaalearn.onrender.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for local testing)

```bash
GOOGLE_CLIENT_ID=1020136274261-fvsfg9jgtaq6d3p0lbf1ib03vhtkn09p.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET=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
```

### GitHub OAuth (Optional)

To enable GitHub login:

1. Go to [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Application name: IAA Learn
4. Homepage URL: `https://iaalearn.onrender.com`
5. Authorization callback URL: `https://iaalearn.onrender.com/api/auth/github/callback`

```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Optional Configuration

```bash
# Demo mode (no database required)
DEMO_MODE=false

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# OpenAI API (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key
```

## Fixing the IPv6 Connection Error

The error `connect ENETUNREACH 2a05:d018:135e:167e:c243:31c8:db49:3310:5432` occurs because:

1. **Supabase provides IPv6 addresses** by default
2. **Render doesn't support IPv6** connections

### Solutions (Choose ONE):

#### Option 1: Use Supabase Connection Pooler (RECOMMENDED)
Change your DATABASE_URL to use port **6543** (pooler) instead of **5432** (direct):

```bash
# OLD (Direct connection - causes IPv6 error):
DATABASE_URL=postgresql://postgres:password@[ipv6-address]:5432/postgres

# NEW (Connection pooler - works with IPv4):
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

To find your pooler URL:
1. Go to Supabase Dashboard
2. Settings > Database
3. Look for "Connection Pooling" section
4. Copy the "Connection string" under "Session mode" or "Transaction mode"

#### Option 2: Use IPv4 Host
Supabase also provides IPv4-compatible hostnames:

```bash
DATABASE_URL=postgresql://postgres.[ref]:[password]@db.[your-project-ref].supabase.co:5432/postgres?sslmode=require
```

Replace:
- `[ref]` with your project reference (e.g., `abc123xyz`)
- `[password]` with your database password
- `[region]` with your region (e.g., `us-east-1`)

## Database Migration

After setting up environment variables, run the migration to add OAuth fields:

```bash
# Connect to your Supabase SQL Editor and run:
# database/migrations/004_add_oauth_fields.sql
```

Or use the Supabase CLI:

```bash
psql "$DATABASE_URL" < database/migrations/004_add_oauth_fields.sql
```

## Testing the Connection

After updating the environment variables:

1. Redeploy your Render service
2. Check the logs for:
   - ✅ Database connection established
   - ✅ Google OAuth strategy configured (if configured)
   - ✅ GitHub OAuth strategy configured (if configured)

3. Test the login at: `https://iaalearn.onrender.com`

## Troubleshooting

### Still getting ENETUNREACH?

1. **Verify DATABASE_URL format**: Make sure you're using the pooler URL (port 6543)
2. **Check Supabase connection settings**: 
   - Go to Supabase > Settings > Database
   - Enable connection pooling
   - Use Session or Transaction mode
3. **SSL Certificate**: Ensure `?sslmode=require` is in your connection string

### OAuth Not Working?

1. **Check redirect URIs**: Make sure they match exactly in OAuth provider settings
2. **Verify environment variables**: CLIENT_ID and CLIENT_SECRET must be set
3. **Check SERVER_URL**: Must match your actual Render URL

### Database Permission Errors?

Run the OAuth migration in Supabase SQL Editor:
```sql
-- From file: database/migrations/004_add_oauth_fields.sql
```

## Quick Setup Checklist

- [ ] Update DATABASE_URL to use Supabase pooler (port 6543)
- [ ] Set JWT_SECRET to a secure random string
- [ ] Set SERVER_URL to your Render URL
- [ ] Set CLIENT_URL to your Render URL
- [ ] Run database migration for OAuth fields
- [ ] (Optional) Configure Google OAuth credentials
- [ ] (Optional) Configure GitHub OAuth credentials
- [ ] Redeploy Render service
- [ ] Test login functionality
