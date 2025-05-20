import React from 'react';
import ImageDisplay from './ImageDisplay';

/**
 * Specialized component for menu item images
 */
const MenuItemImage = ({ 
  image, 
  category, 
  alt = 'Menu item', 
  size = 80, 
  className = '' 
}) => {
  // Choose appropriate placeholder based on category
  const getPlaceholderForCategory = (category) => {
    if (category?.toLowerCase() === 'beverages') {
      return '/placeholders/drinks.png';
    }
    return '/placeholders/meal.png';
  };
  
  return (
    <ImageDisplay 
      imagePath={image}
      alt={alt}
      size={size}
      className={className}
      type="menu"
      placeholderImage={getPlaceholderForCategory(category)}
    />
  );
};

export default MenuItemImage;
