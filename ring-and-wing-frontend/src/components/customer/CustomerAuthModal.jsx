import React, { useState } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import './CustomerAuthModal.css';

const CustomerAuthModal = ({ isOpen, onClose }) => {
  const { signup, login } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: ''
  });

  // Reset form on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setLoginPhone('');
    setLoginPassword('');
    setSignupData({
      phone: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      email: ''
    });
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!loginPhone || !loginPassword) {
      setError('Please enter phone number and password');
      setIsLoading(false);
      return;
    }

    const result = await login(loginPhone, loginPassword);

    if (result.success) {
      onClose();
      // Success notification could be added here
    } else {
      setError(result.message || 'Login failed');
    }

    setIsLoading(false);
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    const { phone, password, confirmPassword, firstName, lastName } = signupData;

    if (!phone || !password || !firstName || !lastName) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Phone number validation (Philippine format)
    const phoneRegex = /^(09|\+639)[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      setError('Invalid phone number format. Use 09XXXXXXXXX or +639XXXXXXXXX');
      setIsLoading(false);
      return;
    }

    const result = await signup({
      phone,
      password,
      firstName,
      lastName,
      email: signupData.email || undefined
    });

    if (result.success) {
      onClose();
      // Success notification could be added here
    } else {
      setError(result.message || 'Signup failed');
    }

    setIsLoading(false);
  };

  // Handle input change for signup
  const handleSignupChange = (e) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    });
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="customer-auth-modal-backdrop" onClick={handleBackdropClick}>
      <div className="customer-auth-modal">
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          <h2>Customer Account</h2>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            Login
          </button>
          <button
            className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabChange('signup')}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {activeTab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-phone">Phone Number</label>
              <input
                type="tel"
                id="login-phone"
                placeholder="09171234567"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signup-firstName">First Name *</label>
                <input
                  type="text"
                  id="signup-firstName"
                  name="firstName"
                  placeholder="Juan"
                  value={signupData.firstName}
                  onChange={handleSignupChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signup-lastName">Last Name *</label>
                <input
                  type="text"
                  id="signup-lastName"
                  name="lastName"
                  placeholder="Dela Cruz"
                  value={signupData.lastName}
                  onChange={handleSignupChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signup-phone">Phone Number *</label>
              <input
                type="tel"
                id="signup-phone"
                name="phone"
                placeholder="09171234567"
                value={signupData.phone}
                onChange={handleSignupChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Email (Optional)</label>
              <input
                type="email"
                id="signup-email"
                name="email"
                placeholder="juan@example.com"
                value={signupData.email}
                onChange={handleSignupChange}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password *</label>
              <input
                type="password"
                id="signup-password"
                name="password"
                placeholder="At least 8 characters"
                value={signupData.password}
                onChange={handleSignupChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="signup-confirmPassword"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={signupData.confirmPassword}
                onChange={handleSignupChange}
                disabled={isLoading}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerAuthModal;
