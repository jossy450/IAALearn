import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { Eye, EyeOff, User, Mail, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  
  // Calculate password strength
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
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please meet at least 3 requirements.');
      return;
    }
    
    setLoading(true);

    try {
      const { confirmPassword, ...registrationData } = formData;
      const response = await authAPI.register(registrationData);
      const { token, user } = response.data;
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrengthLabel(passwordStrength.score);
  
  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-logo">
            <User size={40} />
          </div>
          <h1 className="auth-title">Interview Answer Assistant</h1>
          <h2 className="auth-subtitle">Create Your Account</h2>
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
              <User size={16} />
              Full Name
            </label>
            <input
              type="text"
              className="input input-with-icon"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">
              <Mail size={16} />
              Email Address
            </label>
            <input
              type="email"
              className="input input-with-icon"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="label">
              <Lock size={16} />
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-with-icon"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
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
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input input-with-icon"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle"
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
            disabled={loading || passwordStrength.score < 3}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Creating account...
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="oauth-buttons">
          <a 
            //href="/api/auth/google"
            href="https://accounts.google.com/v3/signin/accountchooser?client_id=1020136274261-fvsfg9jgtaq6d3p0lbf1ib03vhtkn09p.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fiaalearn.onrender.com%2Fapi%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=profile+email&dsh=S-367915222%3A1769798481913221&o2v=2&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMa090CILoT4SPz5jLyUVMb0fXNbvzsKZWzV7ilHpolsNdjE8zQKnRdhT4_0OPMRNCBzNSSXrAAQsrplUA4QE_ps3ZoPPqAuaGgd-Em5xJvV_e5DmIaip-L-U7SYv-MTt0bw7hvz4v_TRwVTr96Ogjy_U6jplf5d31IxWZXK8RTslgPeLRj8vzvjI19_wKzpNgy4SHTlHUQLdRBOPfTkLgGTbyMEU-UuSdqyQ6aP5-I7AtHkmvkrMjfojfmIim8w3JjUw4Jr3oEPzSWf2yzUvO841p1virE7FdeY7sTb7NLjirrzpUG9SImsuur1TfW-F0-k0M1gh6xgcoRWGOQ1JBOF07BLL08TOKCc408rsvbcAibmEnaENYQWvn3RI-INMp-GWiIvv7HHDCGFol7jb868lPI8B_WCj720mnEwGdkqYiCLo8rpNm6ergbk27lFXxJUHzNj6WtjN6fzYcHtH-Wq_N0xzjEMpweKgDJs4QFvkW6_wU%26flowName%3DGeneralOAuthFlow%26as%3DS-367915222%253A1769798481913221%26client_id%3D1020136274261-fvsfg9jgtaq6d3p0lbf1ib03vhtkn09p.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fiaalearn.onrender.com"
            className="btn btn-outline btn-block oauth-btn"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </a>
          
          <a 
            href="/api/auth/github"
            className="btn btn-outline btn-block oauth-btn"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
