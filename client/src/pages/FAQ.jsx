import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle, Mail, Phone } from 'lucide-react';
import './FAQ.css';

function FAQ() {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqData = [
    {
      question: "What is Mightysky Interview Assistant?",
      answer: "Mightysky is an AI-powered interview preparation platform that helps you practice and improve your interview skills through realistic mock interviews, personalized feedback, and comprehensive analytics."
    },
    {
      question: "How do I start a practice interview?",
      answer: "Simply navigate to the Dashboard and click 'Start New Session'. Choose your interview type, role, and experience level. The AI will generate relevant questions and guide you through the interview process."
    },
    {
      question: "What types of interviews does Mightysky support?",
      answer: "We support various interview types including technical interviews, behavioral interviews, system design interviews, and role-specific interviews for software engineering, product management, data science, and more."
    },
    {
      question: "Is my interview data private and secure?",
      answer: "Yes, we take privacy and security seriously. All your interview sessions are encrypted and stored securely. You can delete your data at any time through the Settings page."
    },
    {
      question: "Can I use Mightysky on mobile devices?",
      answer: "Absolutely! Mightysky has a dedicated mobile app for iOS and Android, plus a mobile-optimized web interface. You can practice interviews anywhere, anytime."
    },
    {
      question: "How does the AI feedback work?",
      answer: "Our advanced AI analyzes your responses for content quality, communication skills, technical accuracy, and provides detailed feedback with specific improvement suggestions and example answers."
    },
    {
      question: "What subscription plans are available?",
      answer: "We offer flexible plans: Free (limited sessions), Basic ($9.99/month), and Pro ($19.99/month). Each plan includes different features like advanced analytics, unlimited sessions, and priority support."
    },
    {
      question: "Can I share my interview sessions with others?",
      answer: "Yes, you can generate shareable links for your completed interview sessions. This is great for getting feedback from mentors or showcasing your progress."
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can manage your subscription through the Settings page or contact our support team. We offer a 30-day money-back guarantee on all paid plans."
    },
    {
      question: "What if I need help or have questions?",
      answer: "You can reach out to our support team through the Feedback page, email us at support@mightysky.com, or check our comprehensive documentation."
    }
  ];

  return (
    <div className="faq-container">
      <div className="faq-header">
        <HelpCircle size={48} className="faq-icon" />
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about Mightysky Interview Assistant</p>
      </div>

      <div className="faq-content">
        <div className="faq-list">
          {faqData.map((item, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleItem(index)}
                aria-expanded={openItems.has(index)}
              >
                <span>{item.question}</span>
                {openItems.has(index) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {openItems.has(index) && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="faq-contact">
          <h2>Still have questions?</h2>
          <p>Can't find what you're looking for? Our support team is here to help.</p>

          <div className="contact-options">
            <a href="/feedback" className="contact-option">
              <MessageCircle size={20} />
              <span>Submit Feedback</span>
            </a>
            <a href="mailto:support@mightysky.com" className="contact-option">
              <Mail size={20} />
              <span>Email Support</span>
            </a>
            <a href="tel:+1-555-0123" className="contact-option">
              <Phone size={20} />
              <span>Call Us</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQ;