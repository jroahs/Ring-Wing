import axios from 'axios';
import { toast } from 'react-toastify';

// Configuration
const API_URL = (window.API_CONFIG?.apiUrl || window.location.origin).replace(/\/$/, '');
const HEALTH_CHECK_INTERVAL = 120000; // 2 minutes (reduced from 30s to prevent connection pool exhaustion)
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts

console.log('API URL configured as:', API_URL); // Debug log to see the API URL being used

// Create axios instance with configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests if available
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle response errors centrally
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle authentication errors
      if (error.response.status === 401) {
        if (error.response.data?.message?.includes('expired')) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          window.location.href = '/login';
          return Promise.reject(new Error('Your session has expired. Please log in again.'));
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Check if the API server is healthy
 * @returns {Promise<boolean>} True if server is healthy, false otherwise
 */
export const checkApiHealth = async () => {
  try {
    console.log('Checking API health with URL:', `${API_URL}/api/health`);
    const response = await axios.get(`${API_URL}/api/health`, { 
      timeout: 5000,
      // Don't include auth headers for health check
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Health check response:', response.data);
    return response.data?.status === 'ok';
  } catch (error) {
    console.error('API health check failed:', error.message);
    return false;
  }
};

/**
 * Start periodic health checking
 * @param {Function} onStatusChange Callback for status changes (true=healthy, false=down)
 * @returns {Function} Function to stop monitoring
 */
export const startHealthMonitoring = (onStatusChange) => {
  let isHealthy = true;
  let consecutiveFailures = 0;
  const MAX_FAILURES_BEFORE_DISCONNECT = 3;
  
  const checkHealth = async () => {
    const serverIsHealthy = await checkApiHealth();
    
    if (isHealthy && !serverIsHealthy) {
      // Server might be down, increment failure counter
      consecutiveFailures++;
      
      if (consecutiveFailures >= MAX_FAILURES_BEFORE_DISCONNECT) {
        // Only mark as down after multiple consecutive failures
        onStatusChange(false);
        isHealthy = false;
        console.log(`Server marked as unhealthy after ${consecutiveFailures} consecutive failures`);
      }
    } else if (!isHealthy && serverIsHealthy) {
      // Server just came back up
      onStatusChange(true);
      isHealthy = true;
      consecutiveFailures = 0;
      console.log('Server connection restored');
    } else if (serverIsHealthy) {
      // Still healthy, reset counter
      consecutiveFailures = 0;
    }
  };
  
  // Initial check
  checkHealth();
  
  // Schedule regular checks
  const intervalId = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
  
  // Return function to stop monitoring
  return () => clearInterval(intervalId);
};

/**
 * Standardized error handling for API requests
 * @param {Error} error The error object from catch block
 * @param {string} fallbackMessage Default message if error doesn't have one
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your connection.';
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  
  return fallbackMessage;
};

/**
 * Display a toast notification for API errors
 * @param {Error} error The error object
 * @param {string} fallbackMessage Default message
 */
export const showApiErrorToast = (error, fallbackMessage = 'An error occurred') => {
  const message = handleApiError(error, fallbackMessage);
  toast.error(message);
};

export default api;