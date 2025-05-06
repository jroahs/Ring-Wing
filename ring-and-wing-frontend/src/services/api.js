import axios from 'axios';

// Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Connection state
let isOnline = true;
let healthCheckInterval = null;
let pendingRequests = [];

// Create axios instance with configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Keep-alive settings to prevent connection issues
  httpAgent: {
    keepAlive: true,
    keepAliveMsecs: 60000, // 1 minute
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Store the request if we're offline to retry later
    if (!isOnline && !config.bypassOfflineCheck) {
      return new Promise((resolve) => {
        pendingRequests.push(() => resolve(config));
      });
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // If we got a successful response, we're definitely online
    if (!isOnline) {
      setOnlineStatus(true);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Network errors might indicate we're offline
    if (!error.response) {
      // Only change status if we're currently online to avoid repeated messaging
      if (isOnline) {
        setOnlineStatus(false);
      }
      
      // For requests that absolutely need to be made, add them to the retry queue
      // This could be an advanced feature for mission-critical operations
      if (originalRequest.retryWhenOnline) {
        return new Promise(resolve => {
          pendingRequests.push(() => resolve(api(originalRequest)));
        });
      }
    }
    
    // Check if we should retry the request
    if (
      error.message.includes('timeout') || 
      error.message.includes('Network Error') ||
      (error.response && error.response.status >= 500) // Server errors
    ) {
      // Initialize retry count if not set
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }
      
      // Check if we should retry
      if (originalRequest._retryCount < MAX_RETRIES) {
        originalRequest._retryCount++;
        
        console.log(`API request failed, retrying (${originalRequest._retryCount}/${MAX_RETRIES}):`, originalRequest.url);
        
        // Wait before retrying - exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1))
        );
        
        // Retry the request
        return api(originalRequest);
      }
    }
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // Check if response data has an expired token message
      if (error.response.data?.message?.includes('expired') || 
          error.response.data?.message?.includes('invalid')) {
        // Clear authentication data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(new Error('Authentication expired. Please log in again.'));
      }
    }
    
    return Promise.reject(error);
  }
);

// Track online/offline status
const setOnlineStatus = (status) => {
  if (status === isOnline) return; // No change
  
  isOnline = status;
  console.log(`Connection status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  
  // Display a user notification about connection status
  if (isOnline) {
    // Try to show a toast notification if available
    if (window.toast?.success) {
      window.toast.success('Connection restored. Resuming operations.');
    }
    
    // Process any pending requests
    const requests = [...pendingRequests];
    pendingRequests = [];
    requests.forEach(reqFn => reqFn());
    
  } else {
    // Show offline notification
    if (window.toast?.error) {
      window.toast.error('Connection lost. Retrying...');
    }
  }
  
  // Manage health check interval
  if (!isOnline && !healthCheckInterval) {
    // Start health check when offline
    healthCheckInterval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
  } else if (isOnline && healthCheckInterval) {
    // Stop health check when back online
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
};

// Health check function
const checkHealth = async () => {
  try {
    await axios({
      url: `${API_URL}/api/health`,
      method: 'GET',
      timeout: 5000,
      bypassOfflineCheck: true // Prevent interceptor from queuing this
    });
    
    // If we get here, the server is back online
    setOnlineStatus(true);
  } catch (error) {
    // Still offline, continue to retry
    console.log('Health check failed, still offline.');
  }
};

// Listen for browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => checkHealth());
  window.addEventListener('offline', () => setOnlineStatus(false));
}

// Helper methods for common HTTP operations
const apiService = {
  // GET request with automatic error handling and retry
  async get(url, config = {}) {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET', url);
      throw error;
    }
  },
  
  // POST request with automatic error handling and retry
  async post(url, data = {}, config = {}) {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, 'POST', url);
      throw error;
    }
  },
  
  // PUT request with automatic error handling and retry
  async put(url, data = {}, config = {}) {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, 'PUT', url);
      throw error;
    }
  },
  
  // DELETE request with automatic error handling and retry
  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error, 'DELETE', url);
      throw error;
    }
  },
  
  // PATCH request with automatic error handling and retry
  async patch(url, data = {}, config = {}) {
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, 'PATCH', url);
      throw error;
    }
  },
  
  // Check server health
  async checkHealth() {
    try {
      const response = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
      return response.data?.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error.message);
      return false;
    }
  },
  
  // Current connection status
  isOnline() {
    return isOnline;
  },
  
  // Centralized error handling
  handleError(error, method, url) {
    // Log all API errors for debugging
    console.error(`API ${method} ${url} failed:`, error);
    
    // Check for network issues
    if (!error.response) {
      console.error('Network error: No response from server. Check your connection.');
    }
  }
};

export default apiService;