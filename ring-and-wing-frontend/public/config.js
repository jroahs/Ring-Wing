// Runtime configuration - loaded before app starts
window.API_CONFIG = {
  apiUrl: window.location.protocol === 'https:' 
    ? window.location.origin  // Use same domain in production
    : 'http://localhost:5000'  // Use localhost in development
};
