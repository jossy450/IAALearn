import React, { useState } from 'react';
import { Send, MessageSquare, Star, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import './Feedback.css';

function Feedback() {
  const [formData, setFormData] = useState({
    type: 'feedback',
    subject: '',
    message: '',
    rating: 0,
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await api.post('/feedback', formData);
      setSubmitStatus('success');
      setFormData({
        type: 'feedback',
        subject: '',
        message: '',
        rating: 0,
        email: ''
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    { value: 'feedback', label: 'General Feedback', icon: MessageSquare },
    { value: 'bug', label: 'Bug Report', icon: AlertCircle },
    { value: 'feature', label: 'Feature Request', icon: Star },
    { value: 'support', label: 'Support Request', icon: CheckCircle }
  ];

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <MessageSquare size={48} className="feedback-icon" />
        <h1>Share Your Feedback</h1>
        <p>We value your input! Help us improve Mightysky by sharing your thoughts, reporting issues, or suggesting new features.</p>
      </div>

      <div className="feedback-content">
        {submitStatus === 'success' && (
          <div className="feedback-alert success">
            <CheckCircle size={20} />
            <span>Thank you for your feedback! We'll review it and get back to you if needed.</span>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="feedback-alert error">
            <AlertCircle size={20} />
            <span>Sorry, there was an error submitting your feedback. Please try again.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label htmlFor="type">Feedback Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              {feedbackTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
            />
            <small>If you'd like us to follow up, please provide your email address.</small>
          </div>

          {formData.type === 'feedback' && (
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
              required
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
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