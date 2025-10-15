import { useEffect } from 'react';

/**
 * Hook to handle multi-tab logout synchronization
 * Works with both socket events and localStorage changes
 */
export const useMultiTabLogout = () => {
  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      // If token was removed in another tab, logout this tab too
      if (e.key === 'token' && e.oldValue && !e.newValue) {
        console.log('[MultiTabLogout] Token removed in another tab, logging out...');
        window.location.href = '/';
      }
      
      // Also check for authToken
      if (e.key === 'authToken' && e.oldValue && !e.newValue) {
        console.log('[MultiTabLogout] AuthToken removed in another tab, logging out...');
        window.location.href = '/';
      }
    };

    // Storage event only fires in OTHER tabs, not the current one
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
};
