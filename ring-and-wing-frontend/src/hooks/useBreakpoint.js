import { useState, useEffect, useCallback } from 'react';

// Tailwind breakpoint definitions
const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)', 
  desktop: '(min-width: 1024px)'
};

// Breakpoint names in priority order (desktop > tablet > mobile)
const BREAKPOINT_NAMES = ['desktop', 'tablet', 'mobile'];

// Get the current breakpoint based on media queries
const getCurrentBreakpoint = () => {
  // Check breakpoints in priority order
  for (const name of BREAKPOINT_NAMES) {
    if (window.matchMedia(BREAKPOINTS[name]).matches) {
      return name;
    }
  }
  // Fallback to mobile if no matches
  return 'mobile';
};

// Check if a specific breakpoint matches
const checkBreakpoint = (breakpoint) => {
  if (!BREAKPOINTS[breakpoint]) {
    console.warn(`Unknown breakpoint: ${breakpoint}`);
    return false;
  }
  return window.matchMedia(BREAKPOINTS[breakpoint]).matches;
};

// Main useBreakpoint hook
export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState(() => {
    // Initialize with current breakpoint
    if (typeof window !== 'undefined') {
      return getCurrentBreakpoint();
    }
    return 'mobile'; // SSR fallback
  });

  // Update breakpoint when media queries change
  const handleBreakpointChange = useCallback(() => {
    const newBreakpoint = getCurrentBreakpoint();
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  useEffect(() => {
    // Create media query listeners for all breakpoints
    const mediaQueryLists = Object.entries(BREAKPOINTS).map(([name, query]) => {
      const mql = window.matchMedia(query);
      
      // Add listener for changes
      mql.addEventListener('change', handleBreakpointChange);
      
      return { name, mql };
    });

    // Set initial breakpoint
    handleBreakpointChange();

    // Cleanup listeners on unmount
    return () => {
      mediaQueryLists.forEach(({ mql }) => {
        mql.removeEventListener('change', handleBreakpointChange);
      });
    };
  }, [handleBreakpointChange]);

  // Helper functions
  const isMobile = currentBreakpoint === 'mobile';
  const isTablet = currentBreakpoint === 'tablet';
  const isDesktop = currentBreakpoint === 'desktop';
  const isMobileOrTablet = isMobile || isTablet;
  const isTabletOrDesktop = isTablet || isDesktop;

  // Function to check specific breakpoint
  const matches = useCallback((breakpoint) => {
    return currentBreakpoint === breakpoint;
  }, [currentBreakpoint]);

  // Function to check if current breakpoint is above specified one
  const above = useCallback((breakpoint) => {
    const breakpointIndex = BREAKPOINT_NAMES.indexOf(breakpoint);
    const currentIndex = BREAKPOINT_NAMES.indexOf(currentBreakpoint);
    return currentIndex < breakpointIndex; // Lower index = higher priority
  }, [currentBreakpoint]);

  // Function to check if current breakpoint is below specified one
  const below = useCallback((breakpoint) => {
    const breakpointIndex = BREAKPOINT_NAMES.indexOf(breakpoint);
    const currentIndex = BREAKPOINT_NAMES.indexOf(currentBreakpoint);
    return currentIndex > breakpointIndex; // Higher index = lower priority
  }, [currentBreakpoint]);

  return {
    // Current breakpoint
    current: currentBreakpoint,
    
    // Boolean helpers
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet,
    isTabletOrDesktop,
    
    // Functional helpers
    matches,
    above,
    below,
    
    // Direct breakpoint checking (for one-off usage)
    check: checkBreakpoint
  };
};

// Export breakpoint constants for use in other components
export { BREAKPOINTS };

export default useBreakpoint;