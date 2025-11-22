import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';
import './CustomerAuth.css';

const CustomerSignup = () => {
  const { signup, isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/self-checkout');
    }
  }, [isAuthenticated, navigate]);

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    const { username, phone, password, confirmPassword, firstName, lastName } = formData;

    if (!username || !phone || !password || !firstName || !lastName) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters');
      setIsLoading(false);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      setError('Username can only contain lowercase letters, numbers, and underscores');
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
      username: username.toLowerCase(),
      phone,
      password,
      firstName,
      lastName,
      email: formData.email || undefined
    });

    if (result.success) {
      navigate('/self-checkout');
    } else {
      setError(result.message || 'Signup failed');
    }

    setIsLoading(false);
  };

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="customer-auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Sign up for Ring & Wings rewards and faster checkout</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Juan"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Dela Cruz"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g., juan_dc, chicken123"
              disabled={isLoading}
              required
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              3-20 characters, lowercase letters, numbers, and underscores only
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="09XXXXXXXXX or +639XXXXXXXXX"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (Optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="juan@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              disabled={isLoading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <div className="auth-footer">
            <p>Already have an account? <button type="button" onClick={() => navigate('/customer/login')} className="link-btn">Login</button></p>
            <button type="button" onClick={() => navigate('/self-checkout')} className="link-btn">Continue as Guest</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerSignup;
