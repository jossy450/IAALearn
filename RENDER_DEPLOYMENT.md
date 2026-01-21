# IAALearn - Render Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the IAALearn application to Render.com.

## Prerequisites

Before deploying, ensure you have:
- A Render account (sign up at https://render.com)
- GitHub repository access (jossy450/IAALearn)
- OpenAI API key (required for the app to function)
- Perplexity API key (optional, for enhanced research features)

## Deployment Options

### Option 1: Deploy WITHOUT Database (Recommended for Testing)

This is the simplest option and works immediately without additional setup.

**Pros:**
- Quick deployment
- No database configuration needed
- Free tier compatible
- Good for testing and demos

**Cons:**
- No data persistence
- Limited functionality (no user accounts, session history)

### Option 2: Deploy WITH PostgreSQL Database

Full-featured deployment with data persistence.

**Pros:**
- Full functionality
- User accounts and authentication
- Session history and analytics
- Production-ready

**Cons:**
- Requires database setup
- May exceed free tier limits
- More complex configuration

---

## Option 1: Deploy WITHOUT Database (DEMO MODE)

### Step 1: Push Fixes to GitHub

All fixes have been applied. Commit and push:

```bash
cd /home/ubuntu/IAALearn
git add .
git commit -m "Fix: Update dependencies and Render deployment configuration"
git push origin main
```

### Step 2: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select the **jossy450/IAALearn** repository
5. Configure the service:

**Basic Settings:**
- **Name:** `iaalearn` (or your preferred name)
- **Region:** Choose closest to your users (e.g., Oregon, Ohio, Frankfurt)
- **Branch:** `main`
- **Root Directory:** Leave blank (uses repository root)
- **Runtime:** `Node`

**Build & Deploy:**
- **Build Command:** 
  ```
  npm install --production=false && cd client && npm install --production=false --legacy-peer-deps && npm run build && cd ..
  ```
- **Start Command:** 
  ```
  node server/index.js
  ```

**Plan:**
- Select **Free** (or paid plan for better performance)

### Step 3: Configure Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default port |
| `DEMO_MODE` | `true` | **IMPORTANT: Enables demo mode without database** |
| `CLIENT_URL` | `https://iaalearn.onrender.com` | Replace with your actual Render URL |
| `JWT_SECRET` | (Auto-generate or use strong random string) | Min 32 characters |
| `OPENAI_API_KEY` | `sk-your-key-here` | **REQUIRED - Get from OpenAI** |
| `PERPLEXITY_API_KEY` | `pplx-your-key-here` | Optional |

**To auto-generate JWT_SECRET:**
- Click "Generate" button next to the field
- Or use: `openssl rand -base64 32`

### Step 4: Configure Health Check

Under **Health Check Path**, enter:
```
/health
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the frontend
   - Start the server
3. Monitor the deployment logs for any errors
4. Deployment typically takes 5-10 minutes

### Step 6: Verify Deployment

Once deployed, test these endpoints:

1. **Health Check:**
   ```
   https://your-app.onrender.com/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Frontend:**
   ```
   https://your-app.onrender.com
   ```
   Should load the application interface

3. **API:**
   ```
   https://your-app.onrender.com/api
   ```
   Should return API information or 404 (expected)

---

## Option 2: Deploy WITH PostgreSQL Database

### Step 1: Create PostgreSQL Database

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure database:
   - **Name:** `iaalearn-db`
   - **Database:** `interview_assistant`
   - **User:** `iaalearn` (auto-generated)
   - **Region:** Same as your web service
   - **Plan:** Free or paid
3. Click **"Create Database"**
4. Wait for database to be provisioned
5. Copy the **Internal Database URL** (starts with `postgresql://`)

### Step 2: Create Web Service

Follow the same steps as Option 1, but with these changes:

**Environment Variables:**

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default port |
| `DEMO_MODE` | `false` | **Use database instead of demo mode** |
| `DATABASE_URL` | (Paste Internal Database URL) | From Step 1 |
| `CLIENT_URL` | `https://iaalearn.onrender.com` | Your Render URL |
| `JWT_SECRET` | (Auto-generate) | Min 32 characters |
| `OPENAI_API_KEY` | `sk-your-key-here` | **REQUIRED** |
| `PERPLEXITY_API_KEY` | `pplx-your-key-here` | Optional |

### Step 3: Run Database Migrations

After the first deployment completes:

1. Go to your web service in Render Dashboard
2. Click **"Shell"** tab
3. Run migration command:
   ```bash
   npm run db:migrate
   ```
4. Verify migrations completed successfully

### Step 4: Verify Database Connection

Check the deployment logs for:
```
✅ Database connected successfully
✅ Server running on port 10000
```

---

## Post-Deployment Configuration

### Update CLIENT_URL

After your first deployment, Render assigns a permanent URL. Update the `CLIENT_URL` environment variable:

1. Go to your web service settings
2. Find **Environment Variables**
3. Update `CLIENT_URL` to your actual URL (e.g., `https://iaalearn.onrender.com`)
4. Save changes (this will trigger a redeploy)

### Configure Custom Domain (Optional)

1. Go to **Settings** → **Custom Domain**
2. Add your domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed by Render
4. Update `CLIENT_URL` environment variable to your custom domain

---

## Troubleshooting

### Build Fails with Dependency Errors

**Error:** `ERESOLVE could not resolve`

**Solution:** Ensure build command includes `--legacy-peer-deps`:
```bash
npm install --production=false && cd client && npm install --production=false --legacy-peer-deps && npm run build && cd ..
```

### App Crashes on Startup

**Error:** `Database connection failed`

**Solution:** 
- If using DEMO_MODE: Ensure `DEMO_MODE=true` is set
- If using database: Verify `DATABASE_URL` is correct and database is running

### Health Check Fails

**Error:** Health check endpoint not responding

**Solution:**
- Verify health check path is `/health` (not `/api/health`)
- Check deployment logs for startup errors
- Ensure PORT environment variable is set to `10000`

### OpenAI API Errors

**Error:** `Invalid API key` or `Unauthorized`

**Solution:**
- Verify `OPENAI_API_KEY` is correctly set
- Check API key is valid at https://platform.openai.com/api-keys
- Ensure API key has sufficient credits

### Large Bundle Warning

**Warning:** `Some chunks are larger than 500 kB`

**Impact:** Slower initial page load, but app will work

**Solution (Optional):**
- Implement code splitting in frontend
- Use dynamic imports for large components
- Not critical for functionality

### Free Tier Limitations

**Issue:** App sleeps after 15 minutes of inactivity

**Solution:**
- Upgrade to paid plan for always-on service
- Or accept 30-60 second cold start delay
- Use a service like UptimeRobot to ping your app every 10 minutes (keeps it awake)

### Puppeteer Issues on Free Tier

**Error:** Puppeteer fails to launch or runs out of memory

**Solution:**
- Puppeteer is resource-intensive
- May not work reliably on free tier
- Consider upgrading to Starter plan or higher
- Or disable features that use Puppeteer

---

## Monitoring and Maintenance

### View Logs

1. Go to your web service in Render Dashboard
2. Click **"Logs"** tab
3. Monitor for errors and performance issues

### Metrics

Render provides basic metrics:
- CPU usage
- Memory usage
- Request count
- Response times

### Automatic Deploys

Render automatically deploys when you push to your main branch:
1. Make changes locally
2. Commit and push to GitHub
3. Render detects changes and redeploys automatically

### Manual Deploy

To manually trigger a deploy:
1. Go to your web service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Security Recommendations

### Environment Variables

✅ **DO:**
- Use strong, random JWT_SECRET (min 32 characters)
- Keep API keys secure and never commit to repository
- Rotate API keys periodically

❌ **DON'T:**
- Share environment variables publicly
- Use weak or default secrets
- Commit `.env` files to Git

### HTTPS

- Render provides free SSL/TLS certificates
- All traffic is automatically encrypted
- No additional configuration needed

### Rate Limiting

The app includes built-in rate limiting:
- 100 requests per 15 minutes per IP
- Adjust in `server/index.js` if needed

---

## Cost Estimates

### Free Tier (Demo Mode)
- **Web Service:** Free
- **Database:** Not needed
- **Total:** $0/month
- **Limitations:** 
  - Sleeps after 15 min inactivity
  - 750 hours/month
  - Shared resources

### Starter Plan (With Database)
- **Web Service:** $7/month
- **PostgreSQL:** $7/month
- **Total:** $14/month
- **Benefits:**
  - Always on
  - Better performance
  - 512 MB RAM
  - 0.5 CPU

### Professional Plan
- **Web Service:** $25/month
- **PostgreSQL:** $20/month
- **Total:** $45/month
- **Benefits:**
  - High performance
  - 2 GB RAM
  - 1 CPU
  - Priority support

---

## Getting OpenAI API Key

1. Go to https://platform.openai.com
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)
6. Add credits to your account ($5-10 recommended for testing)

**Note:** OpenAI charges per API usage. Monitor your usage at https://platform.openai.com/usage

---

## Support and Resources

### Official Documentation
- Render Docs: https://render.com/docs
- Node.js on Render: https://render.com/docs/deploy-node-express-app

### IAALearn Resources
- GitHub Repository: https://github.com/jossy450/IAALearn
- Issues: https://github.com/jossy450/IAALearn/issues
- Documentation: See README.md and other guides in repository

### Getting Help
1. Check deployment logs for specific errors
2. Review this troubleshooting guide
3. Search Render community forum
4. Open GitHub issue with error details

---

## Quick Reference

### Essential Environment Variables (Demo Mode)
```
NODE_ENV=production
PORT=10000
DEMO_MODE=true
CLIENT_URL=https://your-app.onrender.com
JWT_SECRET=your-generated-secret-min-32-chars
OPENAI_API_KEY=sk-your-openai-key
```

### Build Command
```bash
npm install --production=false && cd client && npm install --production=false --legacy-peer-deps && npm run build && cd ..
```

### Start Command
```bash
node server/index.js
```

### Health Check Path
```
/health
```

---

## Next Steps After Deployment

1. ✅ Test all core features
2. ✅ Verify API endpoints work
3. ✅ Check mobile responsiveness
4. ✅ Test QR code scanning (if using mobile features)
5. ✅ Monitor logs for errors
6. ✅ Set up uptime monitoring
7. ✅ Configure custom domain (optional)
8. ✅ Share with users and gather feedback

---

**Deployment Date:** January 2026  
**Last Updated:** January 21, 2026  
**Version:** 2.0.0
