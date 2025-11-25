import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL } from '../App';

const CustomerAuthContext = createContext();

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
};

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accountRestricted, setAccountRestricted] = useState(null); // { action, reason }
  const [socket, setSocket] = useState(null);

  // Force logout function (for account restrictions)
  const forceLogout = useCallback((reason) => {
    console.log('[CustomerAuth] Force logout triggered:', reason);
    localStorage.removeItem('customer_token');
    setCustomer(null);
    setToken(null);
    setIsAuthenticated(false);
    setAccountRestricted({ action: reason.action, reason: reason.reason });
  }, []);

  // Initialize socket connection for real-time account restrictions
  useEffect(() => {
    if (customer && token) {
      const newSocket = io(API_URL, {
        transports: ['websocket', 'polling'],
        auth: { token, customerId: customer._id }
      });

      newSocket.on('connect', () => {
        console.log('[CustomerAuth] Socket connected for account monitoring');
        // Join customer-specific room
        newSocket.emit('joinCustomerRoom', customer._id);
      });

      // Listen for account restriction events
      newSocket.on('customerAccountRestricted', (data) => {
        console.log('[CustomerAuth] Account restriction event received:', data);
        if (data.customerId === customer._id) {
          forceLogout(data);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('[CustomerAuth] Socket disconnected');
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [customer, token, forceLogout]);

  // Load token and customer on mount
  useEffect(() => {
    const loadCustomer = async () => {
      const storedToken = localStorage.getItem('customer_token');
      
      if (storedToken) {
        try {
          // Verify token and get customer data
          const response = await axios.get(`${API_URL}/api/customer/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (response.data.success) {
            setCustomer(response.data.customer);
            setToken(storedToken);
            setIsAuthenticated(true);
            console.log('[CustomerAuth] Customer loaded:', {
              id: response.data.customer._id,
              username: response.data.customer.username,
              fullCustomer: response.data.customer
            });
          } else {
            // Invalid token, clear it
            localStorage.removeItem('customer_token');
          }
        } catch (error) {
          console.error('Error loading customer:', error);
          // Check if account is restricted
          if (error.response?.status === 403) {
            setAccountRestricted({
              action: 'deactivated',
              reason: error.response?.data?.message || 'Account is inactive'
            });
          }
          localStorage.removeItem('customer_token');
        }
      }
      
      setIsLoading(false);
    };

    loadCustomer();
  }, []);

  // Signup function
  const signup = async (signupData) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/customer/auth/signup`,
        signupData
      );

      if (response.data.success) {
        const { customer: customerData, token: authToken } = response.data;
        
        // Save token
        localStorage.setItem('customer_token', authToken);
        
        // Update state
        setCustomer(customerData);
        setToken(authToken);
        setIsAuthenticated(true);

        return { success: true, customer: customerData };
      }

      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed. Please try again.'
      };
    }
  };

  // Login function
  const login = async (identifier, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/customer/auth/login`,
        { identifier, password }
      );

      if (response.data.success) {
        const { customer: customerData, token: authToken } = response.data;
        
        // Save token
        localStorage.setItem('customer_token', authToken);
        
        // Update state
        setCustomer(customerData);
        setToken(authToken);
        setIsAuthenticated(true);

        return { success: true, customer: customerData };
      }

      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint if needed
      if (token) {
        await axios.post(
          `${API_URL}/api/customer/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state and storage regardless of API call result
      localStorage.removeItem('customer_token');
      setCustomer(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  };

  // Refresh customer data
  const refreshCustomer = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/api/customer/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCustomer(response.data.customer);
      }
    } catch (error) {
      console.error('Error refreshing customer:', error);
      // Check if account was restricted
      if (error.response?.status === 403) {
        forceLogout({
          action: 'deactivated',
          reason: error.response?.data?.message || 'Account is inactive'
        });
      }
    }
  };

  // Clear restriction message
  const clearRestriction = () => {
    setAccountRestricted(null);
  };

  const value = {
    customer,
    token,
    isAuthenticated,
    isLoading,
    accountRestricted,
    signup,
    login,
    logout,
    refreshCustomer,
    clearRestriction
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export default CustomerAuthContext;
