import React from 'react';
import { Link } from 'react-router-dom';

function Disclaimer() {
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

        <h1 style={{ color: '#1a1a2e', marginBottom: '10px', fontSize: '1.8em', fontWeight: '700' }}>
          Disclaimer
        </h1>
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '0.9em' }}>
          <strong>Last Updated:</strong> March 2026
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          1. Educational Purpose Only
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          IAA Learn (Interview Answer Assistant) is designed as an educational and practice tool to help users prepare for job interviews. The content, questions, suggestions, and feedback provided through this service are intended solely for:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Interview preparation and practice</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Skill development and improvement</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Educational purposes</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          2. No Guarantees
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          While we strive to provide helpful and accurate guidance, IAA Learn makes no guarantees about:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>The accuracy, completeness, or reliability of any information provided</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>The effectiveness of any interview techniques or suggestions</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>The outcome of any actual job interview</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Employment or job placement results</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          3. Not Professional Advice
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          The service does not provide:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Legal, medical, or financial advice</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Career counseling or professional employment consulting</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Job placement services</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Professional certification or credentials</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          4. User Responsibility
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          Users are solely responsible for:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Reviewing and validating all information before use</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Making their own decisions regarding job applications and interviews</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Their conduct during actual job interviews</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Ensuring their responses are appropriate and truthful</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          5. Third-Party Content
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          Our service may include links to third-party websites or content. We are not responsible for the content, accuracy, or opinions expressed on such websites.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          6. Limitation of Liability
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          Mighty Sky Tech and IAA Learn shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from:
        </p>
        <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
          <li style={{ marginBottom: '8px', color: '#333' }}>Use of or inability to use the service</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Any content obtained through the service</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Unauthorized access to your data</li>
          <li style={{ marginBottom: '8px', color: '#333' }}>Technical failures or errors</li>
        </ul>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          7. Changes to Service
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.
        </p>

        <h2 style={{ color: '#1a1a2e', marginTop: '30px', marginBottom: '15px', fontSize: '1.3em', fontWeight: '600' }}>
          8. Contact
        </h2>
        <p style={{ marginBottom: '15px', color: '#333' }}>
          For questions about this disclaimer, please contact us at support@mightyskytech.com
        </p>

        <p style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', color: '#666', fontSize: '0.9em' }}>
          <a href="https://mightyskytech.com" style={{ color: '#2563eb', marginRight: '15px' }}>Mighty Sky Tech</a>
          <Link to="/privacy" style={{ color: '#2563eb' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

export default Disclaimer;
