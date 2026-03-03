import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Mail,
  Search,
  Filter,
  X
} from 'lucide-react';
import './FAQ.css';

const faqData = [
  {
    category: 'Getting Started',
    question: 'What is Mightysky Interview Assistant?',
    answer:
      'Mightysky is an AI-powered interview preparation platform that helps you practice and improve your interview skills through realistic mock interviews, personalized feedback, and comprehensive analytics.'
  },
  {
    category: 'Getting Started',
    question: 'How do I start a practice interview?',
    answer:
      "Navigate to the Dashboard and click 'Start New Session'. Choose your interview type, role, and experience level. The AI then generates relevant questions and guides you through the interview flow."
  },
  {
    category: 'Product',
    question: 'What types of interviews does Mightysky support?',
    answer:
      'We support technical, behavioural, system design, and role-specific interviews for software engineering, product management, data science, and more.'
  },
  {
    category: 'Privacy & Security',
    question: 'Is my interview data private and secure?',
    answer:
      'Yes. Your interview sessions are encrypted and stored securely. You can also delete your data at any time from your settings.'
  },
  {
    category: 'Platform',
    question: 'Can I use Mightysky on mobile devices?',
    answer:
      'Yes. Mightysky provides a mobile-friendly web experience and mobile app support so you can practice from anywhere.'
  },
  {
    category: 'Product',
    question: 'How does the AI feedback work?',
    answer:
      'Our AI analyses your responses for content quality, communication, and technical depth, then provides actionable suggestions and sample improvements.'
  },
  {
    category: 'Billing',
    question: 'What subscription plans are available?',
    answer:
      'We offer Free, Basic, and Pro plans with different limits and features. Visit the subscription page for current pricing and benefits.'
  },
  {
    category: 'Product',
    question: 'Can I share my interview sessions with others?',
    answer:
      'Yes. You can generate shareable links for completed sessions to request mentor feedback or track your progress with others.'
  },
  {
    category: 'Billing',
    question: 'How do I cancel my subscription?',
    answer:
      'Manage your subscription from the Settings page, or contact support if you need help with cancellation or billing issues.'
  },
  {
    category: 'Support',
    question: 'What if I need help or have questions?',
    answer:
      'You can contact us via the Feedback page or email support. We review requests quickly and prioritize account/access issues.'
  }
];

function FAQ() {
  const [openItems, setOpenItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(
    () => ['All', ...new Set(faqData.map((item) => item.category))],
    []
  );

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return faqData.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' || item.category === activeCategory;

      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const toggleItem = (question) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(question)) {
      newOpenItems.delete(question);
    } else {
      newOpenItems.add(question);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="faq-container">
      <div className="faq-header">
        <HelpCircle size={48} className="faq-icon" />
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about Mightysky Interview Assistant</p>
      </div>

      <div className="faq-content">
        <div className="faq-controls">
          <div className="faq-search">
            <Search size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions"
              aria-label="Search FAQs"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="faq-filter">
            <Filter size={16} />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              aria-label="Filter FAQs by category"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="faq-list">
          {filteredFaqs.map((item) => (
            <div key={item.question} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleItem(item.question)}
                aria-expanded={openItems.has(item.question)}
              >
                <span className="faq-question-meta">
                  <span>{item.question}</span>
                  <span className="faq-category-tag">{item.category}</span>
                </span>
                {openItems.has(item.question) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {openItems.has(item.question) && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}

          {filteredFaqs.length === 0 && (
            <div className="faq-empty">
              <h3>No matching FAQs</h3>
              <p>Try a different keyword or select another category.</p>
            </div>
          )}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQ;