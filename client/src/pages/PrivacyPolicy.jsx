import React from 'react';
import { Link } from 'react-router-dom';

function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#1a1a2e'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e0e0e0' }}>
          <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Login
          </Link>
        </div>

        <h1 style={{ color: '#1a1a2e', marginBottom: '20px', fontSize: '1.8em', fontWeight: '700' }}>
          Privacy Policy
        </h1>

        <p style={{ marginBottom: '15px', color: '#333' }}>
          IAA Learn ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          1. Information We Collect
        </h2>

        <h3 style={{ color: '#1a1a2e', marginTop: '20px', marginBottom: '10px', fontSize: '1.1em', fontWeight: '600' }}>
          Personal Information
        </h3>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Account Information:</strong> Email address and name when you register</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>CV and Resume:</strong> Documents you upload for personalized interview preparation</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Job Descriptions:</strong> Job postings you submit for tailored questions</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Interview Responses:</strong> Your answers during mock interview sessions</li>
        </ul>

        <h3 style={{ color: '#1a1a2e', marginTop: '20px', marginBottom: '10px', fontSize: '1.1em', fontWeight: '600' }}>
          Device Information
        </h3>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Device Type:</strong> Mobile device model and operating system</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Push Notification Token:</strong> For sending push notifications</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Usage Data:</strong> App interactions and feature usage (via Firebase Analytics)</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          2. How We Use Your Information
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>We use the information we collect to:</p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Provide and maintain our services</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Personalize interview questions based on your CV and job descriptions</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Send push notifications for interview reminders and updates</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Improve our app functionality and user experience</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Analyze app usage to enhance features (Firebase Analytics)</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Communicate with you about your account and service updates</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          3. Data Storage and Security
        </h2>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Authentication:</strong> Managed securely via Supabase</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>File Storage:</strong> CVs and documents stored securely in cloud storage</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Data Encryption:</strong> All data transmitted over HTTPS is encrypted</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Access Control:</strong> Only authorized personnel can access user data</li>
        </ul>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          We implement reasonable security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          4. Third-Party Services
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>We use the following third-party services:</p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Supabase:</strong> User authentication and database</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Firebase (Google):</strong> Analytics and crash reporting</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Ycloud/Telnyx:</strong> SMS notifications (if enabled)</li>
          <li style={{ marginBottom: '8px', color: '#333' }}><strong>Fly.io:</strong> Cloud hosting</li>
        </ul>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          These services have their own privacy policies governing their use of your information.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          5. Data Sharing
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          We do not sell, trade, or rent your personal information to third parties. We may share information:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>With your consent</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>To comply with legal obligations</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>To protect our rights and prevent fraud</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>In connection with a business transfer or merger</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          6. Your Rights
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>You have the right to:</p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Access your personal information</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Correct inaccurate data</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Delete your account and associated data</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Opt out of analytics tracking</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Withdraw consent where applicable</li>
        </ul>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          To exercise these rights, please contact us at the email provided below.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          7. Children's Privacy
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          Our app is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          8. Push Notifications
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>We may send push notifications to:</p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Remind you of scheduled practice sessions</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Notify you of new features</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Alert you to account-related information</li>
        </ul>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          You can opt out of push notifications at any time through your device settings.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          9. Changes to This Policy
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          10. Contact Us
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          If you have questions about this Privacy Policy, please contact us:
        </p>
        <p style={{ marginBottom: '10px', color: '#333' }}>
          <strong>Email:</strong> support@mightyskytech.com
        </p>
        <p style={{ marginBottom: '10px', color: '#333' }}>
          <strong>Company:</strong> Mighty Sky Tech
        </p>
        <p style={{ marginBottom: '10px', color: '#333' }}>
          <strong>Website:</strong> https://mightyskytech.com
        </p>

        <p style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', color: '#666', fontSize: '0.9em' }}>
          Last Updated: March 2026
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
