import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './Auth.css';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  useEffect(() => {
    const password = formData.password;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    setPasswordStrength({ score, checks });
  }, [formData.password]);

  const getStrengthLabel = (score) => {
    if (score === 0) return { text: '', color: '' };
    if (score <= 2) return { text: 'Weak', color: 'strength-weak' };
    if (score <= 3) return { text: 'Fair', color: 'strength-fair' };
    if (score <= 4) return { text: 'Good', color: 'strength-good' };
    return { text: 'Strong', color: 'strength-strong' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please meet at least 3 requirements.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({ token, password: formData.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo success-logo">
              <CheckCircle size={40} />
            </div>
            <h1 className="auth-title">Password Reset Successful</h1>
            <p className="auth-subtitle">
              Your password has been updated successfully
            </p>
          </div>

          <div className="success-message">
            <p>Redirecting you to the login page...</p>
          </div>
        </div>
      </div>
    );
  }

  const strength = getStrengthLabel(passwordStrength.score);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/mightysky-logo.svg" alt="Mightysky" style={{width: '70px', height: '70px'}} />
          </div>
          <h1 className="auth-title">Mightysky</h1>
          <p className="auth-tagline">Interview Answer Assistant</p>
          <p className="auth-subtitle">
            Enter a strong password for your account
          </p>
        </div>
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label">
              <Lock size={16} />
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-with-icon"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a strong password"
                required
                autoFocus
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                disabled={!token}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.password && (
              <>
                <div className="password-strength-bar">
                  <div 
                    className={`password-strength-fill ${strength.color}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                {strength.text && (
                  <div className={`password-strength-label ${strength.color}`}>
                    {strength.text}
                  </div>
                )}
                <div className="password-requirements">
                  {Object.entries({
                    length: 'At least 8 characters',
                    uppercase: 'One uppercase letter',
                    lowercase: 'One lowercase letter',
                    number: 'One number',
                    special: 'One special character'
                  }).map(([key, label]) => (
                    <div key={key} className="requirement">
                      {passwordStrength.checks[key] ? (
                        <CheckCircle size={14} className="check-icon success" />
                      ) : (
                        <XCircle size={14} className="check-icon" />
                      )}
                      <span className={passwordStrength.checks[key] ? 'met' : ''}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="form-group">
            <label className="label">
              <Lock size={16} />
              Confirm New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input input-with-icon"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle"
                disabled={!token}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className="password-mismatch">
                <XCircle size={14} />
                Passwords do not match
              </div>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div className="password-match">
                <CheckCircle size={14} />
                Passwords match
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading || !token || passwordStrength.score < 3}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Resetting Password...
              </>
            ) : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Remember your password? Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
