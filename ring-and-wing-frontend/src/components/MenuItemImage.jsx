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
  
  // If image is empty string, null, or undefined, use placeholder
  const imageSrc = (!image || image === '') ? null : image;
  
  return (
    <ImageDisplay 
      imagePath={imageSrc}
      alt={alt}
      size={size}
      className={className}
      type="menu"
      placeholderImage={getPlaceholderForCategory(category)}
    />
  );
};

export default MenuItemImage;
