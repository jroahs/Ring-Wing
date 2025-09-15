import React from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import MobileLayout from './MobileLayout';
import TabletLayout from './TabletLayout';
import DesktopLayout from './DesktopLayout';

/**
 * LayoutSelector - Renders the appropriate layout based on current breakpoint
 * 
 * This component acts as the primary layout router for the SelfCheckout system.
 * It uses the useBreakpoint hook to detect the current viewport size and renders
 * the most appropriate layout component for optimal user experience.
 * 
 * Breakpoint mapping:
 * - Mobile: < 768px (MobileLayout)
 * - Tablet: 768px - 1024px (TabletLayout)  
 * - Desktop: > 1024px (DesktopLayout)
 * 
 * All layouts receive the same props interface for consistent functionality
 * across different device sizes.
 */
const LayoutSelector = ({ 
  searchTerm, 
  onSearchChange, 
  orderNumber,
  orderSubmitted,
  onProcessOrder 
}) => {
  const { current: breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();

  // Debug info (can be removed in production)
  React.useEffect(() => {
    console.log(`[LayoutSelector] Current breakpoint: ${breakpoint}`);
    console.log(`[LayoutSelector] isMobile: ${isMobile}, isTablet: ${isTablet}, isDesktop: ${isDesktop}`);
  }, [breakpoint, isMobile, isTablet, isDesktop]);

  // Common props passed to all layout components
  const layoutProps = {
    searchTerm,
    onSearchChange,
    orderNumber,
    orderSubmitted,
    onProcessOrder
  };

  // Render appropriate layout based on breakpoint
  if (isMobile) {
    return <MobileLayout {...layoutProps} />;
  }
  
  if (isTablet) {
    return <TabletLayout {...layoutProps} />;
  }
  
  if (isDesktop) {
    return <DesktopLayout {...layoutProps} />;
  }

  // Fallback to mobile layout if breakpoint detection fails
  console.warn('[LayoutSelector] Unknown breakpoint, falling back to mobile layout');
  return <MobileLayout {...layoutProps} />;
};

export default LayoutSelector;