# Deployment Guide - IAALearn Enhanced Version

## Quick Start for Render Deployment

### Prerequisites
1. GitHub account with IAALearn repository forked/connected
2. Render.com account
3. Supabase PostgreSQL database
4. Google OAuth credentials (already configured)

### Step 1: Database Setup

Run the migrations on Supabase:
```bash
# Connect to your Supabase database and run:
psql postgresql://[user]:[password]@[host]/postgres

# Then paste contents of these migration files in order:
# 1. database/migrations/005_add_user_documents.sql
# 2. database/migrations/006_add_user_roles.sql
```

### Step 2: Create Admin User

```sql
-- Set yourself as admin in Supabase SQL editor
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Step 3: Environment Variables on Render

Add these variables in Render dashboard:

**Critical Variables:**
```
DATABASE_URL=postgresql://postgres.XXXX:password@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
JWT_SECRET=your-secure-random-string-here
NODE_ENV=production
DEMO_MODE=false
```

**OAuth Variables:**
```
GOOGLE_CLIENT_ID=742075219702-buaq474um3qf8t4n32dg04pvs971788p.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret-here
```

**URLs:**
```
CLIENT_URL=https://your-app.onrender.com
SERVER_URL=https://your-app.onrender.com
```

**Optional - File Upload:**
```
UPLOAD_MAX_SIZE=10485760
DOCUMENT_STORAGE=local
```

### Step 4: Deploy

1. Connect your GitHub repository to Render
2. Set Build Command:
```bash
npm install && npm install --prefix server && npm install --prefix client && npm run build --prefix client
```

3. Set Start Command:
```bash
npm start --prefix server
```

4. Deploy!

### Step 5: Verify Deployment

Check these endpoints:
- `https://your-app.onrender.com/health` - Should return `{"status":"healthy"}`
- `https://your-app.onrender.com` - Should show the app

### Step 6: Test Features

**Login:**
1. Visit `/login`
2. Test with email/password
3. Test with Google OAuth

**File Uploads:**
1. Login
2. Click "Add CV & Job Description"
3. Upload a PDF or TXT file

**QR Code:**
1. Create a session
2. Click "Transfer to Mobile"
3. Scan QR code with phone

**Admin Dashboard:**
1. Login with admin account
2. Visit `/admin`
3. View analytics and user management

## Troubleshooting

### Database Connection Error (ENETUNREACH)
**Solution:** Make sure you're using the Supabase **pooler** connection:
```
aws-1-eu-west-1.pooler.supabase.com:6543
NOT
aws-1-eu-west-1.postgres.supabase.co:5432
```

### QR Code Not Scanning
**Solution:** 
1. Check transfer code is 6 characters
2. Ensure full URL is in QR code
3. Test manual code entry first

### File Upload Fails
**Solution:**
1. Check file size < 10MB
2. Ensure file format is PDF, DOC, DOCX, or TXT
3. Check auth token is valid

### Admin Dashboard 404
**Solution:**
1. Verify user has `role = 'admin'` in database
2. Log out and log back in
3. Check browser console for errors

## Feature Checklist

### Login Enhancements
- [x] Email/password login
- [x] Google OAuth
- [x] CV file upload
- [x] Job description upload
- [x] File persistence

### QR Code Fixes
- [x] Proper QR generation
- [x] Mobile deep linking
- [x] 6-character transfer codes
- [x] 5-minute expiration
- [x] Manual code fallback

### Admin Dashboard
- [x] User statistics
- [x] Session analytics
- [x] User management
- [x] Audit logs
- [x] System health
- [x] Daily active users chart
- [x] Role-based access

### Document Management
- [x] File upload
- [x] Document storage
- [x] Type validation
- [x] Size limits
- [x] Soft deletion
- [x] Audit logging

## Security Notes

1. **File Uploads:** Max 10MB, validated mime types
2. **Admin Access:** Role-based with middleware protection
3. **Audit Logs:** All file operations tracked
4. **Database:** Pooler connection with SSL enabled
5. **Tokens:** 7-day JWT expiration

## Performance Tips

1. Database queries are indexed for quick lookups
2. Pagination on all list endpoints
3. Lazy loading of admin components
4. Static file serving in production

## Support

If issues occur:
1. Check Render logs: `render.com/dashboard` > your app > Logs
2. Check database connection with `/health` endpoint
3. Verify all environment variables are set
4. Check browser console for client errors

## Next Deployment Steps

After initial deployment:

1. **Backup Data:** Set up Supabase backups
2. **Monitor:** Enable Render metrics
3. **Security:** Enable HTTPS (automatic on Render)
4. **Testing:** Run load tests
5. **Documentation:** Share admin dashboard URL with team

## Production Checklist

- [x] Database migrations applied
- [x] Environment variables configured
- [x] OAuth credentials set
- [x] Admin user created
- [x] File upload directory configured
- [x] HTTPS enabled
- [x] Error logging configured
- [x] Health check endpoint verified

---

**Last Updated:** January 28, 2026
**Version:** 2.0.0 (Enhanced)
