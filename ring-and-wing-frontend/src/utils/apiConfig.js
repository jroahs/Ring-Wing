/**
 * API URL utility - uses runtime config if available, otherwise falls back to env var
 */
export const getApiUrl = () => {
  // First try runtime config (loaded from /config.js in production)
  if (window.API_CONFIG?.apiUrl) {
    return window.API_CONFIG.apiUrl;
  }
  
  // Fall back to environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Final fallback
  return (window.API_CONFIG?.apiUrl || window.location.origin).replace(/\/$/, '');
};

/**
 * Helper to make API calls
 */
export const apiCall = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
};

export const API_URL = getApiUrl();
