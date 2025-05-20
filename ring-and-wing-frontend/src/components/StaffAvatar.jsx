import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * StaffAvatar component - Handles displaying staff profile images correctly
 */
const StaffAvatar = ({ imagePath, alt = 'Staff photo', size = 40, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  
  useEffect(() => {
    if (!imagePath) {
      // Use local placeholder from public folder
      setImageSrc('/placeholders/staff.png');
      return;
    }
    
    if (imagePath.startsWith('data:')) {
      // Base64 image
      setImageSrc(imagePath);
      return;
    }
    
    // Handle different path formats
    const baseUrl = 'http://localhost:5000';
    
    // Direct path to image in /uploads/staff
    if (imagePath.includes('/uploads/staff/')) {
      const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      setImageSrc(`${baseUrl}${cleanPath}`);
    } else {
      // Fallback to direct path for staff avatars
      const filename = imagePath.split('/').pop();
      setImageSrc(`${baseUrl}/uploads/staff/${filename}`);
    }
    console.log(`[${new Date().toISOString()}] StaffAvatar - Setting image source to: ${imageSrc} (from: ${imagePath})`);
  }, [imagePath]);
    const handleImageError = () => {
    console.error(`Failed to load image: ${imageSrc}`);
    setImageError(true);
    // Use local placeholder from public folder
    setImageSrc('/placeholders/staff.png');
  };
    return (
    <div 
      className={`bg-cover bg-center overflow-hidden ${className}`}
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

export default StaffAvatar;
