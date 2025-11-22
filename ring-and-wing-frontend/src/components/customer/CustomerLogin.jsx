import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';
import './CustomerAuth.css';

const CustomerLogin = () => {
  const { login, isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [identifier, setIdentifier] = useState(''); // username or phone
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/self-checkout');
    }
  }, [isAuthenticated, navigate]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!identifier || !password) {
      setError('Please enter username/phone and password');
      setIsLoading(false);
      return;
    }

    const result = await login(identifier, password);

    if (result.success) {
      navigate('/self-checkout');
    } else {
      setError(result.message || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="customer-auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Login to your Ring & Wings account</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="identifier">Username or Phone</label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter username or phone number"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div className="auth-footer">
            <p>Don't have an account? <button type="button" onClick={() => navigate('/customer/signup')} className="link-btn">Sign Up</button></p>
            <button type="button" onClick={() => navigate('/self-checkout')} className="link-btn">Continue as Guest</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerLogin;
