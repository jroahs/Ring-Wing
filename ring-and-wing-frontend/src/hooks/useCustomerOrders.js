import { useState, useCallback } from 'react';
import axios from 'axios';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useCustomerOrders = () => {
  const { token, isAuthenticated } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0
  });

  // Fetch orders with pagination
  const fetchOrders = useCallback(async (options = {}) => {
    if (!isAuthenticated || !token) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { page = 1, limit = 20, status } = options;

    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (status) params.append('status', status);

      const response = await axios.get(
        `${API_URL}/api/customer/orders?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setOrders(response.data.orders);
        setPagination({
          page: response.data.page,
          pages: response.data.pages,
          total: response.data.total
        });
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Fetch single order by ID
  const fetchOrderById = async (orderId) => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/customer/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        return { success: true, order: response.data.order };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error fetching order:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to fetch order'
      };
    }
  };

  // Reorder items from a previous order
  const reorder = async (orderId) => {
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/customer/orders/${orderId}/reorder`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        return { success: true, cartItems: response.data.cartItems };
      }

      return { success: false, message: response.data.message };
    } catch (err) {
      console.error('Error reordering:', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to reorder'
      };
    }
  };

  return {
    orders,
    isLoading,
    error,
    pagination,
    fetchOrders,
    fetchOrderById,
    reorder
  };
};

export default useCustomerOrders;
