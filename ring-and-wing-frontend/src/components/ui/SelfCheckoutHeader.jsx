import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import CustomerAccountMenu from '../customer/CustomerAccountMenu';
import { NotificationBell } from '../selfcheckout';
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
    navigate('/customer/orders');
  };

  const handleOpenAddresses = () => {
    navigate('/customer/addresses');
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
        <div className="auth-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NotificationBell size="md" />
          <CustomerAccountMenu
            onOpenOrders={handleOpenOrders}
            onOpenAddresses={handleOpenAddresses}
          />
        </div>
      )}
    </div>
  );
};

export default SelfCheckoutHeader;
