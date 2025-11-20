import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const colors = {
  primary: '#2e0304',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b'
};

/**
 * Reusable Loading Spinner Component
 * Can be used inline or as a full-screen overlay
 */
export const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'spinner',
  message = '',
  fullScreen = false,
  overlay = false,
  color = colors.accent
}) => {
  // Prevent scrolling when fullScreen loading is shown
  useEffect(() => {
    if (fullScreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
        document.documentElement.style.overflow = 'unset';
      };
    }
  }, [fullScreen]);
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  // Spinner Animation (Default)
  const SpinnerAnimation = () => (
    <motion.div
      className={`${sizeClasses[size]} border-4 border-t-transparent rounded-full`}
      style={{ borderColor: `${color}40`, borderTopColor: color }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );

  // Pulse Animation
  const PulseAnimation = () => (
    <motion.div
      className="flex space-x-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`rounded-full ${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}`}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.2
          }}
        />
      ))}
    </motion.div>
  );

  // Ring Animation (Like Ring & Wing brand)
  const RingAnimation = () => (
    <div className="relative" style={{ width: sizeClasses[size].split(' ')[0], height: sizeClasses[size].split(' ')[0] }}>
      <motion.div
        className="absolute inset-0 border-4 rounded-full"
        style={{ borderColor: `${color}20` }}
      />
      <motion.div
        className="absolute inset-0 border-4 border-transparent rounded-full"
        style={{ borderTopColor: color, borderRightColor: color }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div
        className="absolute inset-2 border-4 border-transparent rounded-full"
        style={{ borderBottomColor: colors.secondary, borderLeftColor: colors.secondary }}
        animate={{ rotate: -360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );

  // Wing Animation (Flapping effect)
  const WingAnimation = () => (
    <motion.div className="flex space-x-1">
      <motion.div
        className={size === 'sm' ? 'w-6 h-8' : size === 'lg' ? 'w-12 h-16' : 'w-8 h-12'}
        style={{ 
          backgroundColor: color,
          clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          transformOrigin: 'bottom center'
        }}
        animate={{
          scaleY: [1, 0.8, 1],
          scaleX: [1, 1.1, 1]
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className={size === 'sm' ? 'w-6 h-8' : size === 'lg' ? 'w-12 h-16' : 'w-8 h-12'}
        style={{ 
          backgroundColor: colors.secondary,
          clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          transformOrigin: 'bottom center'
        }}
        animate={{
          scaleY: [1, 0.8, 1],
          scaleX: [1, 1.1, 1]
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3
        }}
      />
    </motion.div>
  );

  // Bouncing Animation
  const BouncingAnimation = () => (
    <motion.div
      className={`${sizeClasses[size]} rounded-full`}
      style={{ backgroundColor: color }}
      animate={{
        y: [-10, 10, -10],
        scale: [1, 0.9, 1]
      }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );

  // Select animation variant
  const renderAnimation = () => {
    switch (variant) {
      case 'pulse':
        return <PulseAnimation />;
      case 'ring':
        return <RingAnimation />;
      case 'wing':
        return <WingAnimation />;
      case 'bounce':
        return <BouncingAnimation />;
      case 'spinner':
      default:
        return <SpinnerAnimation />;
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {renderAnimation()}
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center font-medium"
          style={{ color: color }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  // Full screen loading
  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ 
          backgroundColor: overlay ? 'rgba(0, 0, 0, 0.5)' : '#fefdfd',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        {content}
      </motion.div>
    );
  }

  // Overlay loading (on top of content)
  if (overlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        {content}
      </motion.div>
    );
  }

  // Inline loading
  return <div className="flex items-center justify-center p-4">{content}</div>;
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  variant: PropTypes.oneOf(['spinner', 'pulse', 'ring', 'wing', 'bounce']),
  message: PropTypes.string,
  fullScreen: PropTypes.bool,
  overlay: PropTypes.bool,
  color: PropTypes.string
};

export default LoadingSpinner;
