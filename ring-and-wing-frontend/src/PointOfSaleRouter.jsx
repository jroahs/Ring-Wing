import React, { useState, useEffect } from 'react';
import PointOfSale from './PointofSale';
import PointOfSaleTablet from './PointOfSaleTablet';

const PointOfSaleRouter = () => {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      // Tablet range: 768px - 1279px
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1280);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return isTablet ? <PointOfSaleTablet /> : <PointOfSale />;
};

export default PointOfSaleRouter;
