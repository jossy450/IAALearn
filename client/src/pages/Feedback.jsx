import React, { useMemo, useState } from 'react';
import {
  Send,
  MessageSquare,
  Star,
  CheckCircle,
  AlertCircle,
  Bug,
  Lightbulb,
  LifeBuoy,
  Mail
} from 'lucide-react';
import api from '../services/api';
import './Feedback.css';

const INITIAL_FORM = {
  type: 'feedback',
  subject: '',
  message: '',
  rating: 0,
  email: ''
};

const FEEDBACK_TYPES = [
  {
    value: 'feedback',
    label: 'General Feedback',
    icon: MessageSquare,
    description: 'Share your overall experience and suggestions.'
  },
  {
    value: 'bug',
    label: 'Bug Report',
    icon: Bug,
    description: 'Tell us what broke and how we can reproduce it.'
  },
  {
    value: 'feature',
    label: 'Feature Request',
    icon: Lightbulb,
    description: 'Suggest a feature that would improve your workflow.'
  },
  {
    value: 'support',
    label: 'Support Request',
    icon: LifeBuoy,
    description: 'Need help? Let us know what you are blocked on.'
  }
];

function Feedback() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  const isFeedbackType = formData.type === 'feedback';
  const subjectLength = formData.subject.trim().length;
  const messageLength = formData.message.trim().length;

  const emailIsValid = useMemo(() => {
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  }, [formData.email]);

  const canSubmit =
    subjectLength >= 3 &&
    messageLength >= 10 &&
    emailIsValid &&
    (!isFeedbackType || formData.rating > 0) &&
    !isSubmitting;

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' && value !== 'feedback' ? { rating: 0 } : {})
    }));

    if (submitStatus.message) {
      setSubmitStatus({ type: '', message: '' });
    }
  };

  const handleRatingChange = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    const payload = {
      type: formData.type,
      subject: formData.subject.trim(),
      message: formData.message.trim()
    };

    if (isFeedbackType && formData.rating > 0) {
      payload.rating = formData.rating;
    }

    const trimmedEmail = formData.email.trim();
    if (trimmedEmail) {
      payload.email = trimmedEmail;
    }

    try {
      await api.post('/feedback', payload);
      setSubmitStatus({
        type: 'success',
        message: "Thank you! Your message has been submitted successfully."
      });
      setFormData(INITIAL_FORM);
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitStatus({
        type: 'error',
        message:
          error?.response?.data?.error ||
          'Sorry, there was an error submitting your feedback. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <MessageSquare size={48} className="feedback-icon" />
        <h1>Share Your Feedback</h1>
        <p>We value your input! Help us improve Mightysky by sharing your thoughts, reporting issues, or suggesting new features.</p>
      </div>

      <div className="feedback-content">
        {submitStatus.type === 'success' && (
          <div className="feedback-alert success">
            <CheckCircle size={20} />
            <span>{submitStatus.message}</span>
          </div>
        )}

        {submitStatus.type === 'error' && (
          <div className="feedback-alert error">
            <AlertCircle size={20} />
            <span>{submitStatus.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label>Feedback Type</label>
            <div className="feedback-type-grid" role="group" aria-label="Feedback Type">
              {FEEDBACK_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = formData.type === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    className={`feedback-type-card ${isActive ? 'active' : ''}`}
                    onClick={() =>
                      handleInputChange({
                        target: { name: 'type', value: type.value }
                      })
                    }
                    aria-pressed={isActive}
                  >
                    <span className="feedback-type-icon">
                      <Icon size={16} />
                    </span>
                    <span className="feedback-type-text">{type.label}</span>
                    <span className="feedback-type-desc">{type.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Brief description of your feedback"
              maxLength={120}
              required
            />
            <div className="input-meta">
              <small>Minimum 3 characters</small>
              <small>{formData.subject.length}/120</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                autoComplete="email"
              />
            </div>
            <small>If you'd like us to follow up, please provide your email address.</small>
            {!emailIsValid && <small className="error-text">Please enter a valid email address.</small>}
          </div>

          {isFeedbackType && (
            <div className="form-group">
              <label>Rating</label>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`star ${formData.rating >= star ? 'active' : ''}`}
                    onClick={() => handleRatingChange(star)}
                  >
                    <Star size={24} fill={formData.rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
                <span className="rating-text">
                  {formData.rating > 0 && `${formData.rating} star${formData.rating > 1 ? 's' : ''}`}
                </span>
              </div>
              {formData.rating === 0 && (
                <small className="error-text">Please select a rating before submitting feedback.</small>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Please provide detailed information about your feedback, bug report, or feature request..."
              rows={6}
              maxLength={2000}
              required
            />
            <div className="input-meta">
              <small>Minimum 10 characters</small>
              <small>{formData.message.length}/2000</small>
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Send Feedback</span>
              </>
            )}
          </button>
        </form>

        <div className="feedback-info">
          <h3>What happens next?</h3>
          <ul>
            <li><strong>Feedback:</strong> We'll review your suggestions and consider them for future updates.</li>
            <li><strong>Bug Reports:</strong> Our team will investigate and work on fixes for reported issues.</li>
            <li><strong>Feature Requests:</strong> We'll evaluate new feature ideas and may reach out for more details.</li>
            <li><strong>Support:</strong> Our support team will respond to your inquiry as quickly as possible.</li>
          </ul>

          <p className="response-time">
            <strong>Expected Response Time:</strong> We aim to respond to all feedback within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Feedback;