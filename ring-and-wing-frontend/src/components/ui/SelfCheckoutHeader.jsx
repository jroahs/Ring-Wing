import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import CustomerAccountMenu from '../customer/CustomerAccountMenu';
import './SelfCheckoutHeader.css';

const SelfCheckoutHeader = () => {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/customer/login');
  };

  const handleSignupClick = () => {
    navigate('/customer/signup');
  };

  const handleOpenOrders = () => {
    // TODO: Implement in Phase 4
    alert('Order history will be implemented in Phase 4');
  };

  const handleOpenAddresses = () => {
    // TODO: Implement in Phase 3
    alert('Address management will be implemented in Phase 3');
  };

  if (isLoading) {
    return <div className="self-checkout-header-placeholder"></div>;
  }

  return (
    <div className="self-checkout-auth-section">
      {!isAuthenticated ? (
        <div className="auth-buttons">
          <button className="auth-btn login-btn" onClick={handleLoginClick}>
            Login
          </button>
          <button className="auth-btn signup-btn" onClick={handleSignupClick}>
            Sign Up
          </button>
        </div>
      ) : (
        <CustomerAccountMenu
          onOpenOrders={handleOpenOrders}
          onOpenAddresses={handleOpenAddresses}
        />
      )}
    </div>
  );
};

export default SelfCheckoutHeader;
