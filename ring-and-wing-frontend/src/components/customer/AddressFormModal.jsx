import React, { useState, useEffect } from 'react';
import { useCustomerAddresses } from '../../hooks/useCustomerAddresses';
import './AddressFormModal.css';

const AddressFormModal = ({ isOpen, onClose, onSuccess, editingAddress = null }) => {
  const { createAddress, updateAddress, isLoading, error: apiError } = useCustomerAddresses();
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    label: 'home',
    recipientName: '',
    recipientPhone: '',
    streetAddress: '',
    barangay: '',
    city: 'Manila',
    province: 'Metro Manila',
    postalCode: '',
    landmark: '',
    deliveryNotes: '',
    isDefault: false
  });

  // Load editing data
  useEffect(() => {
    if (editingAddress) {
      setFormData({
        label: editingAddress.label || 'home',
        recipientName: editingAddress.recipientName || '',
        recipientPhone: editingAddress.recipientPhone || '',
        streetAddress: editingAddress.streetAddress || '',
        barangay: editingAddress.barangay || '',
        city: editingAddress.city || 'Manila',
        province: editingAddress.province || 'Metro Manila',
        postalCode: editingAddress.postalCode || '',
        landmark: editingAddress.landmark || '',
        deliveryNotes: editingAddress.deliveryNotes || '',
        isDefault: editingAddress.isDefault || false
      });
    }
  }, [editingAddress]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    if (!formData.recipientName.trim()) {
      setError('Recipient name is required');
      return false;
    }
    if (!formData.recipientPhone.trim()) {
      setError('Recipient phone is required');
      return false;
    }
    if (!/^(09|\+639)[0-9]{9}$/.test(formData.recipientPhone)) {
      setError('Invalid phone format. Use 09XXXXXXXXX or +639XXXXXXXXX');
      return false;
    }
    if (!formData.streetAddress.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!formData.barangay.trim()) {
      setError('Barangay is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.province.trim()) {
      setError('Province is required');
      return false;
    }
    if (!formData.postalCode.trim()) {
      setError('Postal code is required');
      return false;
    }
    if (!/^[0-9]{4}$/.test(formData.postalCode)) {
      setError('Postal code must be 4 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    let result;
    if (editingAddress) {
      result = await updateAddress(editingAddress._id, formData);
    } else {
      result = await createAddress(formData);
    }

    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || 'Failed to save address');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="address-form-modal-backdrop" onClick={handleBackdropClick}>
      <div className="address-form-modal">
        <div className="modal-header">
          <h2>{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="address-form">
          {(error || apiError) && (
            <div className="form-error">
              {error || apiError}
            </div>
          )}

          {/* Address Label */}
          <div className="form-group">
            <label htmlFor="label">Address Label *</label>
            <div className="label-selector">
              <button
                type="button"
                className={`label-btn ${formData.label === 'home' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, label: 'home' }))}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Home
              </button>
              <button
                type="button"
                className={`label-btn ${formData.label === 'work' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, label: 'work' }))}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Work
              </button>
              <button
                type="button"
                className={`label-btn ${formData.label === 'other' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, label: 'other' }))}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Other
              </button>
            </div>
          </div>

          {/* Recipient Info */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="recipientName">Recipient Name *</label>
              <input
                type="text"
                id="recipientName"
                name="recipientName"
                value={formData.recipientName}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="recipientPhone">Recipient Phone *</label>
              <input
                type="tel"
                id="recipientPhone"
                name="recipientPhone"
                value={formData.recipientPhone}
                onChange={handleChange}
                placeholder="09171234567"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Address Fields */}
          <div className="form-group">
            <label htmlFor="streetAddress">Street Address *</label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              placeholder="123 Main St, Bldg 5, Unit 10"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="barangay">Barangay *</label>
            <input
              type="text"
              id="barangay"
              name="barangay"
              value={formData.barangay}
              onChange={handleChange}
              placeholder="e.g., Poblacion, Malate"
              disabled={loading}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Manila"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="province">Province *</label>
              <input
                type="text"
                id="province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                placeholder="Metro Manila"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="postalCode">Postal Code *</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="1000"
                maxLength="4"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="form-group">
            <label htmlFor="landmark">Landmark (Optional)</label>
            <input
              type="text"
              id="landmark"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="Near 7-Eleven, beside blue gate"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deliveryNotes">Delivery Notes (Optional)</label>
            <textarea
              id="deliveryNotes"
              name="deliveryNotes"
              value={formData.deliveryNotes}
              onChange={handleChange}
              placeholder="Additional instructions for delivery..."
              rows="3"
              disabled={loading}
            />
          </div>

          {/* Set Default */}
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                disabled={loading}
              />
              <span>Set as default delivery address</span>
            </label>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressFormModal;
