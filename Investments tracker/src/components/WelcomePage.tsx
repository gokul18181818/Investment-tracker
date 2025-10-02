import React from 'react';
import './WelcomePage.css';

interface WelcomePageProps {
  onGetStarted: () => void;
}

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-title">💸 Investment Tracker</h1>
          <p className="welcome-subtitle">Smart financial tracking for your investments and paychecks</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Track Investments</h3>
            <p>Monitor your 401k, HSA, ESPP, and crypto contributions in one place</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3>Parse Paystubs</h3>
            <p>Automatically extract data from your paystub PDFs with AI-powered OCR</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Visualize Progress</h3>
            <p>Track your progress toward contribution limits and financial goals</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>AI Assistant</h3>
            <p>Get personalized financial insights with our intelligent chatbot</p>
          </div>
        </div>

        <button className="get-started-btn" onClick={onGetStarted}>
          Get Started
        </button>

        <div className="welcome-footer">
          <p className="footer-text">Secure • Private • Easy to Use</p>
        </div>
      </div>
    </div>
  );
}
