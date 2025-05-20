import React, { useState, useEffect } from 'react';

/**
 * Generic image component that handles various image sources and fallbacks
 * Used for menu items, products, etc.
 */
const ImageDisplay = ({ 
  imagePath, 
  alt = 'Image', 
  size = 80, 
  className = '',
  type = 'menu', // 'menu', 'staff', or 'custom'
  placeholderImage = null,
  baseUrl = 'http://localhost:5000'
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  
  useEffect(() => {
    if (!imagePath) {
      const placeholder = getPlaceholder(type);
      setImageSrc(placeholder);
      return;
    }
    
    // Base64 encoded image
    if (imagePath.startsWith('data:')) {
      setImageSrc(imagePath);
      return;
    }
    
    // Image is already a full URL
    if (imagePath.startsWith('http')) {
      setImageSrc(imagePath);
      return;
    }
    
    // Image path from backend
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    setImageSrc(`${baseUrl}${path}`);
    
    console.log(`[${new Date().toISOString()}] ImageDisplay - Setting image source to: ${imageSrc} (from: ${imagePath})`);
  }, [imagePath, type, placeholderImage, baseUrl]);
  
  // Get appropriate placeholder based on image type
  const getPlaceholder = (type) => {
    if (placeholderImage) return placeholderImage;
    
    switch (type) {
      case 'staff':
        return '/placeholders/staff.png';
      case 'menu':
        return '/placeholders/meal.png';
      case 'beverage':
        return '/placeholders/drinks.png';
      default:
        return '/placeholders/image.png';
    }
  };
  
  const handleImageError = () => {
    console.error(`Failed to load image: ${imageSrc}`);
    setImageError(true);
    // Use appropriate placeholder
    setImageSrc(getPlaceholder(type));
  };
  
  return (
    <div 
      className={`overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '4px',
        position: 'relative'
      }}
    >
      <img 
        src={imageSrc}
        alt={alt}
        onError={handleImageError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />
    </div>
  );
};

export default ImageDisplay;
