import React, { useState, useEffect } from 'react';
import PointOfSale from './PointofSale';
import PointOfSaleTablet from './PointOfSaleTablet';
import { API_URL } from './App';

const PointOfSaleRouter = () => {
  const [layoutMode, setLayoutMode] = useState('auto'); // 'auto', 'desktop', 'tablet'
  const [isTabletScreen, setIsTabletScreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch POS layout setting from backend
  useEffect(() => {
    const fetchPosSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/settings/pos`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.layout) {
            setLayoutMode(data.data.layout);
          }
        }
      } catch (error) {
        console.error('Failed to fetch POS settings:', error);
        // Default to auto mode on error
        setLayoutMode('auto');
      } finally {
        setLoading(false);
      }
    };

    fetchPosSettings();
  }, []);

  // Screen size detection (used when layout is 'auto')
  useEffect(() => {
    const checkScreenSize = () => {
      // Tablet range: 768px - 1279px
      const width = window.innerWidth;
      setIsTabletScreen(width >= 768 && width < 1280);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Show loading state briefly
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading POS...</div>
      </div>
    );
  }

  // Determine which layout to use based on setting
  const useTabletLayout = 
    layoutMode === 'tablet' || 
    (layoutMode === 'auto' && isTabletScreen);

  return useTabletLayout ? <PointOfSaleTablet /> : <PointOfSale />;
};

export default PointOfSaleRouter;
