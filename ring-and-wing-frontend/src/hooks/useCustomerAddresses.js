import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useCustomerAddresses = () => {
  const { token, isAuthenticated } = useCustomerAuth();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all addresses
  const fetchAddresses = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setAddresses([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/customer/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAddresses(response.data.addresses);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError(err.response?.data?.message || 'Failed to fetch addresses');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Load addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Create new address
  const createAddress = async (addressData) => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/customer/addresses`,
        addressData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Refresh addresses list
        await fetchAddresses();
        return { success: true, address: response.data.address };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error creating address:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to create address'
      };
    }
  };

  // Update address
  const updateAddress = async (addressId, addressData) => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/customer/addresses/${addressId}`,
        addressData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Refresh addresses list
        await fetchAddresses();
        return { success: true, address: response.data.address };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error updating address:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update address'
      };
    }
  };

  // Delete address
  const deleteAddress = async (addressId) => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/customer/addresses/${addressId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Refresh addresses list
        await fetchAddresses();
        return { success: true };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error deleting address:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to delete address'
      };
    }
  };

  // Set default address
  const setDefaultAddress = async (addressId) => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/customer/addresses/${addressId}/set-default`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Refresh addresses list
        await fetchAddresses();
        return { success: true, address: response.data.address };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error setting default address:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to set default address'
      };
    }
  };

  // Get default address
  const getDefaultAddress = () => {
    return addresses.find(addr => addr.isDefault) || null;
  };

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress
  };
};

export default useCustomerAddresses;
