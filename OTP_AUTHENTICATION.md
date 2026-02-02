# OTP Authentication Implementation

## Overview
The application now supports OTP (One-Time Password) authentication as an alternative to traditional password-based login. Users can choose to receive a 6-digit verification code via email instead of entering their password.

## Features
- ✅ **Dual Authentication Modes**: Users can toggle between password and OTP login
- ✅ **Email-Based OTP**: 6-digit verification codes sent to registered email
- ✅ **Secure Storage**: OTPs stored with expiration and attempt tracking
- ✅ **Rate Limiting**: Maximum 5 verification attempts per code
- ✅ **Auto-Expiry**: Codes expire after 10 minutes
- ✅ **Resend Functionality**: Users can request new codes with 60-second cooldown
- ✅ **Database Migration**: Automated schema update with `login_otp` table

## Database Schema

### login_otp Table
```sql
CREATE TABLE login_otp (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    delivery_method VARCHAR(10) DEFAULT 'email',  -- 'email' or 'sms'
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_login_otp_email`: Fast lookup by email
- `idx_login_otp_expires_at`: Efficient expiration checks
- `idx_login_otp_is_verified`: Query optimization for verified codes

## API Endpoints

### POST /api/auth/request-otp
Request a new OTP code for login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "deliveryMethod": "email"  // optional, defaults to "email"
}
```

**Response (Development Mode):**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "otpCode": "123456"  // Only in development
}
```

**Response (Production Mode):**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

**Error Responses:**
- `404`: Email not registered
- `429`: Too many requests (rate limiting)
- `500`: Server error

### POST /api/auth/verify-otp
Verify the OTP code and log in.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  }
}
```

**Error Responses:**
- `400`: Invalid or expired OTP code
- `403`: Maximum attempts exceeded (5 attempts)
- `404`: Email not registered or no OTP requested
- `500`: Server error

## Frontend Implementation

### Login Flow

1. **Initial State**: User sees email input and toggle option
2. **Choose OTP**: Click "Use verification code instead"
3. **Enter Email**: Input registered email address
4. **Request Code**: Click "Send Verification Code"
5. **Check Email**: Receive 6-digit code (in development, code shown in response)
6. **Enter Code**: Input the 6-digit code
7. **Verify**: Click "Verify Code" to authenticate
8. **Success**: Redirected to dashboard with JWT token

### Toggle Between Methods
Users can switch between OTP and password login at any time using the toggle link at the bottom of the form.

### Resend Logic
- After sending a code, a 60-second cooldown prevents spam
- Timer displays countdown: "Resend code in 59s"
- After cooldown, "Resend code" link becomes active
- Clicking resend generates a new code and invalidates the old one

## Security Features

### Rate Limiting
- Maximum 5 verification attempts per OTP code
- After 5 failed attempts, code is marked as invalid
- User must request a new code

### Expiration
- OTP codes expire 10 minutes after creation
- Expired codes are automatically rejected
- Database cleanup function removes old codes (optional cron job)

### Attempt Tracking
- Each failed verification increments the `attempts` counter
- Prevents brute force attacks on 6-digit codes
- Failed attempts are logged for security monitoring

### Code Generation
- Uses Node.js `crypto.randomInt()` for secure random numbers
- 6-digit codes (000000-999999 range)
- Statistically secure against guessing attacks with attempt limits

## Email Integration (TODO)

Currently, the OTP code is logged to console in development mode. To enable email delivery:

1. **Configure Email Service** (in `.env`):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="Interview Assistant <noreply@yourdomain.com>"
   ```

2. **Update auth.js** (server/routes/auth.js):
   Replace the console.log statement with actual email sending:
   ```javascript
   const nodemailer = require('nodemailer');
   
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: process.env.SMTP_PORT,
     secure: false,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   });
   
   await transporter.sendMail({
     from: process.env.SMTP_FROM,
     to: email,
     subject: 'Your Login Verification Code',
     html: `
       <h2>Login Verification Code</h2>
       <p>Your verification code is: <strong>${otpCode}</strong></p>
       <p>This code expires in 10 minutes.</p>
       <p>If you didn't request this code, please ignore this email.</p>
     `
   });
   ```

## SMS Integration (Future Enhancement)

To enable SMS delivery:

1. **Add Phone Number Field**:
   - Update `users` table schema to include `phone_number`
   - Modify registration form to capture phone numbers
   - Add phone number verification during registration

2. **Configure SMS Provider** (e.g., Twilio):
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. **Update OTP Request Logic**:
   - Accept `deliveryMethod: "sms"` in request
   - Route to SMS sending function
   - Store phone number in `login_otp` table

## Testing

### Development Mode
In development, OTP codes are returned in the API response for easy testing:
```json
{
  "success": true,
  "message": "Verification code sent",
  "otpCode": "123456"  // Only in NODE_ENV=development
}
```

### Manual Testing Steps
1. Navigate to login page
2. Click "Use verification code instead"
3. Enter a registered email (e.g., test@example.com)
4. Click "Send Verification Code"
5. Check API response in browser DevTools (Network tab)
6. Copy the `otpCode` from the response
7. Paste into the verification code input
8. Click "Verify Code"
9. Confirm successful login and redirect

### Production Testing
1. Configure email service (see Email Integration above)
2. Set `NODE_ENV=production`
3. Request OTP code (no code in response)
4. Check email inbox for verification code
5. Enter code and verify login

## Migration Instructions

The database migration has been executed automatically. If running on a new environment:

1. **Run Migration Script**:
   ```bash
   node database/run_otp_migration.js
   ```

2. **Verify Table Creation**:
   ```sql
   SELECT * FROM login_otp LIMIT 1;
   ```

3. **Check Indexes**:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'login_otp';
   ```

## Troubleshooting

### "Email not registered" Error
- Ensure the user has an account in the `users` table
- Check email spelling and case sensitivity

### "Invalid or expired OTP" Error
- Code may have expired (10-minute limit)
- Request a new code
- Check that code was entered correctly

### "Maximum attempts exceeded" Error
- User has failed verification 5 times
- Must request a new OTP code
- Previous code is now invalid

### OTP Not Received (Email)
- Check SMTP configuration in `.env`
- Verify email service credentials
- Check spam/junk folder
- Review server logs for email sending errors

### Database Connection Errors
- Ensure `DATABASE_URL` is set correctly
- Verify SSL configuration for hosted databases
- Check that migration was run successfully

## Code References

- **Backend Routes**: [server/routes/auth.js](server/routes/auth.js)
- **API Client**: [client/src/services/api.js](client/src/services/api.js)
- **Login UI**: [client/src/pages/Login.jsx](client/src/pages/Login.jsx)
- **Database Schema**: [server/database/schema.sql](server/database/schema.sql)
- **Migration Script**: [database/migrations/006_add_login_otp_table.sql](database/migrations/006_add_login_otp_table.sql)

## Next Steps

1. ✅ Complete Login.jsx UI implementation
2. ✅ Add database migration
3. ✅ Create OTP backend endpoints
4. ⏳ Integrate email service (nodemailer)
5. ⏳ Add phone number field to registration
6. ⏳ Implement SMS delivery (optional)
7. ⏳ Add rate limiting middleware
8. ⏳ Implement OTP analytics/monitoring
9. ⏳ Add email/SMS templates with branding
10. ⏳ Create admin dashboard for OTP statistics

## Performance Considerations

- OTP codes use indexed email lookups for fast retrieval
- Expired codes should be cleaned up periodically (cron job)
- Consider caching active OTP requests to prevent database hammering
- Rate limiting prevents abuse of OTP generation endpoint

## Security Best Practices

- ✅ Use cryptographically secure random number generation
- ✅ Enforce expiration (10 minutes)
- ✅ Limit verification attempts (5 max)
- ✅ Store OTPs securely (no plaintext passwords)
- ⏳ Add rate limiting at route level
- ⏳ Log suspicious activity (multiple failed attempts)
- ⏳ Implement IP-based blocking for repeated failures
- ⏳ Consider 2FA for sensitive operations beyond login
