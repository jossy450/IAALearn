# 🚀 Quick Start - Enhanced Login & Access

## Overview
This guide will help you get started with the new and improved login system.

## ⚡ Quick Setup

### 1. Database Migration
Run the new migration to add password reset fields:

```bash
cd database
psql -d your_database_name -f migrations/008_add_password_reset.sql
```

Or if you have a migration runner:
```bash
cd database
./run_migration.sh
```

### 2. Start the Application

**Backend:**
```bash
cd server
npm install  # if needed
npm start
```

**Frontend:**
```bash
cd client
npm install  # if needed
npm run dev
```

### 3. Access the New Features

- **Login Page**: http://localhost:5173/login
- **Register Page**: http://localhost:5173/register
- **Forgot Password**: http://localhost:5173/forgot-password
- **Reset Password**: http://localhost:5173/reset-password?token=TOKEN

## 🎯 Testing the Features

### Test Login Security
1. Go to login page
2. Enter wrong password 5 times
3. See account lockout message
4. Wait 15 minutes or clear localStorage:
   ```javascript
   localStorage.clear()
   ```

### Test Password Strength
1. Go to register page
2. Start typing a password
3. Watch the strength indicator change colors
4. See checkmarks appear as requirements are met
5. Submit button enables only when password is strong

### Test Password Reset
1. Click "Forgot?" on login page
2. Enter your email
3. Check console logs for reset token
4. Copy the token
5. Go to: `http://localhost:5173/reset-password?token=YOUR_TOKEN`
6. Enter new password
7. Submit and get redirected to login

## 🔍 Visual Guide

### Login Page Features
```
┌─────────────────────────────────────┐
│           [Lock Icon]               │
│   Interview Answer Assistant        │
│         Welcome Back                │
├─────────────────────────────────────┤
│ [Alert] Login attempts remaining    │
├─────────────────────────────────────┤
│ Email Address                       │
│ [you@example.com]                   │
│                                     │
│ Password              [Forgot?]     │
│ [•••••••••] [👁]                   │
│                                     │
│ ☑ Remember me for 30 days          │
│                                     │
│     [Sign In Button]                │
├─────────────────────────────────────┤
│         or continue with            │
│                                     │
│     [Google]    [GitHub]            │
├─────────────────────────────────────┤
│   Don't have an account? Register   │
└─────────────────────────────────────┘
```

### Register Page Features
```
┌─────────────────────────────────────┐
│           [User Icon]               │
│   Interview Answer Assistant        │
│      Create Your Account            │
├─────────────────────────────────────┤
│ Full Name                           │
│ [John Doe]                          │
│                                     │
│ Email Address                       │
│ [you@example.com]                   │
│                                     │
│ Password                            │
│ [•••••••••] [👁]                   │
│ [====Progress Bar====] Strong ✓     │
│                                     │
│ Requirements:                       │
│ ✓ At least 8 characters             │
│ ✓ One uppercase letter              │
│ ✓ One lowercase letter              │
│ ✓ One number                        │
│ ✗ One special character             │
│                                     │
│ Confirm Password                    │
│ [•••••••••] [👁]                   │
│ ✓ Passwords match                   │
│                                     │
│     [Create Account]                │
├─────────────────────────────────────┤
│         or continue with            │
│                                     │
│     [Google]    [GitHub]            │
├─────────────────────────────────────┤
│  Already have an account? Sign In   │
└─────────────────────────────────────┘
```

### Password Reset Flow
```
Step 1: Forgot Password
┌─────────────────────────────────────┐
│           [Mail Icon]               │
│      Reset Your Password            │
│  Enter your email to get reset link │
├─────────────────────────────────────┤
│ Email Address                       │
│ [you@example.com]                   │
│                                     │
│     [Send Reset Link]               │
├─────────────────────────────────────┤
│     [←] Back to Sign In             │
└─────────────────────────────────────┘

Step 2: Check Email (Success)
┌─────────────────────────────────────┐
│        [Checkmark Icon]             │
│        Check Your Email             │
│  We've sent instructions to email   │
├─────────────────────────────────────┤
│ If an account exists, you'll        │
│ receive reset instructions.         │
│                                     │
│     [←] Back to Sign In             │
└─────────────────────────────────────┘

Step 3: Reset Password
┌─────────────────────────────────────┐
│           [Lock Icon]               │
│      Create New Password            │
│  Enter a strong password            │
├─────────────────────────────────────┤
│ New Password                        │
│ [•••••••••] [👁]                   │
│ [====Progress Bar====] Good         │
│                                     │
│ Requirements: (same as register)    │
│                                     │
│ Confirm New Password                │
│ [•••••••••] [👁]                   │
│ ✓ Passwords match                   │
│                                     │
│     [Reset Password]                │
├─────────────────────────────────────┤
│  Remember password? Sign In         │
└─────────────────────────────────────┘
```

## 🎨 Color Scheme

### Password Strength Colors
- **Weak** (0-2): 🔴 Red (#ef4444)
- **Fair** (3): 🟠 Orange (#f59e0b)
- **Good** (4): 🔵 Blue (#3b82f6)
- **Strong** (5): 🟢 Green (#10b981)

### Alert Colors
- **Error**: 🔴 Red background
- **Warning**: 🟡 Yellow background
- **Info**: 🔵 Blue background
- **Success**: 🟢 Green background

## 📝 Common Tasks

### Reset Failed Login Attempts
```javascript
// In browser console
localStorage.removeItem('loginAttempts');
localStorage.removeItem('loginLockTime');
location.reload();
```

### Test Password Reset in Dev
```bash
# 1. Request reset (console will show token)
# 2. Copy token from console output
# 3. Open reset URL with token:
http://localhost:5173/reset-password?token=YOUR_TOKEN_HERE
```

### Verify Database Migration
```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
  'reset_token', 
  'reset_token_expiry',
  'failed_login_attempts',
  'last_failed_login',
  'locked_until'
);

-- Should return 5 rows
```

## 🔧 Configuration

### Optional: Email Service Setup

To enable actual email sending (currently logs to console):

1. Choose an email service:
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

2. Add to `.env`:
```env
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-api-key
EMAIL_FROM=noreply@yourapp.com
```

3. Update `server/routes/auth.js`:
```javascript
// Find the TODO in forgot-password route
const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
await sendEmail(user.email, 'Password Reset', resetUrl);
```

4. Implement sendEmail function:
```javascript
const sendEmail = async (to, subject, resetUrl) => {
  // Use your email service SDK here
  await emailService.send({
    to,
    from: process.env.EMAIL_FROM,
    subject,
    html: `Click here to reset: ${resetUrl}`
  });
};
```

## 🐛 Troubleshooting

### Issue: Port already in use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

### Issue: Database connection error
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL
```

### Issue: Migration fails
```bash
# Check current schema
psql -d your_db -c "\d users"

# Rollback if needed (manually drop columns)
psql -d your_db -c "ALTER TABLE users DROP COLUMN IF EXISTS reset_token"
```

### Issue: Password strength not working
1. Check browser console for errors
2. Verify React is rendering correctly
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

## 📚 Learn More

- Full Documentation: [LOGIN_IMPROVEMENTS.md](./LOGIN_IMPROVEMENTS.md)
- Quick Summary: [LOGIN_IMPROVEMENTS_SUMMARY.md](./LOGIN_IMPROVEMENTS_SUMMARY.md)
- Main README: [README.md](./README.md)

## ✨ Tips

1. **Test in incognito**: Avoids cached data issues
2. **Check console**: Logs show reset tokens in dev
3. **Use React DevTools**: Inspect component state
4. **Clear localStorage**: When testing fresh state
5. **Monitor network**: Check API calls in DevTools

## 🎉 You're Ready!

The enhanced login system is now set up and ready to use. Enjoy the improved security and user experience!

---

**Need Help?**
- Check the full documentation
- Review error messages carefully
- Check browser and server console logs
- Verify database migration ran successfully

**Last Updated**: January 30, 2026
