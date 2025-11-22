import React, { useState } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import CustomerAuthModal from '../customer/CustomerAuthModal';
import CustomerAccountMenu from '../customer/CustomerAccountMenu';
import './SelfCheckoutHeader.css';

const SelfCheckoutHeader = () => {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  const handleLoginClick = () => {
    setAuthModalTab('login');
    setShowAuthModal(true);
  };

  const handleSignupClick = () => {
    setAuthModalTab('signup');
    setShowAuthModal(true);
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
    <>
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

      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default SelfCheckoutHeader;
