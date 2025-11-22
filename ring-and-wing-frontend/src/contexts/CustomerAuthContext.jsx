import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CustomerAuthContext = createContext();

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
          } else {
            // Invalid token, clear it
            localStorage.removeItem('customer_token');
          }
        } catch (error) {
          console.error('Error loading customer:', error);
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
  const login = async (phone, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/customer/auth/login`,
        { phone, password }
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
    }
  };

  const value = {
    customer,
    token,
    isAuthenticated,
    isLoading,
    signup,
    login,
    logout,
    refreshCustomer
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export default CustomerAuthContext;
