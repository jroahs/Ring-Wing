import React from 'react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { useCustomerAddresses } from '../hooks/useCustomerAddresses';
import './DeliveryAddressSelector.css';

const DeliveryAddressSelector = ({ selectedAddressId, onSelect, onAddNew }) => {
  const { isAuthenticated } = useCustomerAuth();
  const { addresses, isLoading, error } = useCustomerAddresses();

  if (!isAuthenticated) {
    return (
      <div className="address-selector">
        <div className="address-auth-prompt">
          <svg width="60" height="60" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
          <h3>Login Required</h3>
          <p>Please log in to select a delivery address or continue as guest</p>
          <button className="guest-continue-btn" onClick={() => onSelect('guest')}>
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="address-selector">
        <div className="address-loading">
          <div className="spinner"></div>
          <p>Loading addresses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="address-selector">
        <div className="address-error">{error}</div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="address-selector">
        <div className="address-empty">
          <svg width="60" height="60" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3>No Addresses Saved</h3>
          <p>Add a delivery address to continue</p>
          <button className="add-address-btn-primary" onClick={onAddNew}>
            Add Delivery Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="address-selector">
      <div className="address-selector-header">
        <h3>Select Delivery Address</h3>
        <button className="add-new-address-btn" onClick={onAddNew}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New
        </button>
      </div>

      <div className="address-list">
        {addresses.map((address) => (
          <div
            key={address._id}
            className={`address-option ${selectedAddressId === address._id ? 'selected' : ''} ${address.isDefault ? 'default' : ''}`}
            onClick={() => onSelect(address._id)}
          >
            <div className="address-radio">
              <div className="radio-circle">
                {selectedAddressId === address._id && <div className="radio-dot"></div>}
              </div>
            </div>

            <div className="address-content">
              <div className="address-label-row">
                <div className="address-label-icon">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    {address.label === 'home' && (
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    )}
                    {address.label === 'work' && (
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    )}
                    {address.label === 'other' && (
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span className="label-text">{address.label.charAt(0).toUpperCase() + address.label.slice(1)}</span>
                </div>
                {address.isDefault && <span className="default-badge-small">Default</span>}
              </div>

              <div className="address-details-compact">
                <p className="recipient-name">{address.recipientName}</p>
                <p className="address-text">{address.street}</p>
                <p className="address-text">{address.barangay}, {address.city}</p>
                <p className="address-text">{address.province} {address.postalCode}</p>
                {address.landmark && <p className="address-landmark">📍 {address.landmark}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryAddressSelector;
