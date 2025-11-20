import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import BrandedLoadingScreen from '../components/ui/BrandedLoadingScreen';
import PropTypes from 'prop-types';

const LoadingContext = createContext();

/**
 * Global Loading Provider
 * Manages application-wide loading states with optional messages
 */
export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingVariant, setLoadingVariant] = useState('ring'); // Default to ring variant for brand
  const [loadingSize, setLoadingSize] = useState('lg');

  /**
   * Show global loading screen
   * @param {string} message - Optional loading message
   * @param {string} variant - Animation variant (spinner, pulse, ring, wing, bounce)
   * @param {string} size - Size of loading animation (sm, md, lg, xl)
   */
  const showLoading = useCallback((message = '', variant = 'ring', size = 'lg') => {
    setLoadingMessage(message);
    setLoadingVariant(variant);
    setLoadingSize(size);
    setLoading(true);
  }, []);

  /**
   * Hide global loading screen
   */
  const hideLoading = useCallback(() => {
    setLoading(false);
    // Clear message after animation completes
    setTimeout(() => {
      setLoadingMessage('');
    }, 300);
  }, []);

  /**
   * Update loading message without hiding
   * @param {string} message - New loading message
   */
  const updateLoadingMessage = useCallback((message) => {
    setLoadingMessage(message);
  }, []);

  /**
   * Execute an async function with loading state
   * @param {Function} asyncFn - Async function to execute
   * @param {string} message - Loading message
   * @param {string} variant - Animation variant
   */
  const withLoading = useCallback(async (asyncFn, message = 'Loading...', variant = 'ring') => {
    showLoading(message, variant);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  const value = {
    loading,
    loadingMessage,
    showLoading,
    hideLoading,
    updateLoadingMessage,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {loading && (
          <BrandedLoadingScreen
            message={loadingMessage || 'Loading...'}
          />
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
};

LoadingProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook to use loading context
 * @returns {Object} Loading context value
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;
