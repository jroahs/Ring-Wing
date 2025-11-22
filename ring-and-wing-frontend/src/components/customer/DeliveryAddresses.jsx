import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useCustomerAddresses } from '../../hooks/useCustomerAddresses';
import AddressFormModal from './AddressFormModal';
import './DeliveryAddresses.css';

const DeliveryAddresses = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const {
    addresses,
    loading,
    error,
    fetchAddresses,
    deleteAddress,
    setDefaultAddress
  } = useCustomerAddresses();

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/customer/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch addresses on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated]);

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowAddressForm(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const handleDelete = async (addressId) => {
    const result = await deleteAddress(addressId);
    if (result.success) {
      setDeleteConfirm(null);
    }
  };

  const handleSetDefault = async (addressId) => {
    await setDefaultAddress(addressId);
  };

  const handleFormClose = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  const handleFormSuccess = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    fetchAddresses(); // Refresh list
  };

  if (authLoading) {
    return (
      <div className="delivery-addresses-page loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="delivery-addresses-page">
      <div className="addresses-container">
        {/* Header */}
        <div className="addresses-header">
          <button className="back-button" onClick={() => navigate('/self-checkout')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <h1>My Delivery Addresses</h1>
          <button className="add-address-btn" onClick={handleAddNew}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Address
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="addresses-loading">
            <div className="spinner"></div>
            <p>Loading addresses...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && addresses.length === 0 && (
          <div className="empty-state">
            <svg width="80" height="80" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <h2>No Delivery Addresses</h2>
            <p>Add your first delivery address to get started</p>
            <button className="add-address-btn-primary" onClick={handleAddNew}>
              Add Address
            </button>
          </div>
        )}

        {/* Address List */}
        {!loading && addresses.length > 0 && (
          <div className="addresses-grid">
            {addresses.map((address) => (
              <div key={address._id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
                {address.isDefault && (
                  <div className="default-badge">Default</div>
                )}

                <div className="address-label">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
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

                <div className="address-recipient">
                  <strong>{address.recipientName}</strong>
                  <span className="recipient-phone">{address.recipientPhone}</span>
                </div>

                <div className="address-details">
                  <p>{address.streetAddress}</p>
                  <p>{address.barangay}, {address.city}</p>
                  <p>{address.province} {address.postalCode}</p>
                  {address.landmark && <p className="landmark">📍 {address.landmark}</p>}
                </div>

                {address.deliveryNotes && (
                  <div className="delivery-notes">
                    <small>Note: {address.deliveryNotes}</small>
                  </div>
                )}

                <div className="address-actions">
                  {!address.isDefault && (
                    <button 
                      className="set-default-btn"
                      onClick={() => handleSetDefault(address._id)}
                    >
                      Set as Default
                    </button>
                  )}
                  <button 
                    className="edit-btn"
                    onClick={() => handleEdit(address)}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => setDeleteConfirm(address._id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === address._id && (
                  <div className="delete-confirm-overlay">
                    <div className="delete-confirm">
                      <p>Delete this address?</p>
                      <div className="confirm-actions">
                        <button onClick={() => handleDelete(address._id)}>Yes, Delete</button>
                        <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Form Modal */}
      <AddressFormModal
        isOpen={showAddressForm}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingAddress={editingAddress}
      />
    </div>
  );
};

export default DeliveryAddresses;
