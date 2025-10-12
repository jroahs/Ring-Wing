import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const colors = {
  primary: '#2e0304',
  accent: '#f1670f',
  secondary: '#853619',
  background: '#fefdfd'
};

/**
 * Branded Loading Screen Component
 * Displays the Ring & Wing logo with animated loading indicators
 */
export const BrandedLoadingScreen = ({ 
  message = 'Loading Ring & Wing...', 
  showLogo = true,
  variant = 'full' // 'full' or 'minimal'
}) => {
  // Logo animation variants
  const logoVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  // Text animation variants
  const textVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.3,
        duration: 0.5
      }
    }
  };

  // Rotating ring animation
  const RingAnimation = () => (
    <div className="relative w-24 h-24">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 border-4 rounded-full opacity-20"
        style={{ borderColor: colors.accent }}
      />
      
      {/* Animated ring segments */}
      <motion.div
        className="absolute inset-0 border-4 border-transparent rounded-full"
        style={{ borderTopColor: colors.accent, borderRightColor: colors.accent }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <motion.div
        className="absolute inset-2 border-4 border-transparent rounded-full"
        style={{ borderBottomColor: colors.secondary, borderLeftColor: colors.secondary }}
        animate={{ rotate: -360 }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Inner ring */}
      <motion.div
        className="absolute inset-4 border-4 border-transparent rounded-full"
        style={{ borderTopColor: colors.primary }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );

  // Animated wing logo
  const WingAnimation = () => (
    <div className="flex items-end justify-center space-x-2 mb-4">
      <motion.div
        className="w-12 h-16"
        style={{ 
          backgroundColor: colors.accent,
          clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          transformOrigin: 'bottom center'
        }}
        animate={{
          scaleY: [1, 0.85, 1],
          scaleX: [1, 1.1, 1]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Center circle (ring) */}
      <motion.div
        className="w-16 h-16 rounded-full border-4 self-center"
        style={{ borderColor: colors.primary }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <motion.div
        className="w-12 h-16"
        style={{ 
          backgroundColor: colors.secondary,
          clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          transformOrigin: 'bottom center'
        }}
        animate={{
          scaleY: [1, 0.85, 1],
          scaleX: [1, 1.1, 1]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      />
    </div>
  );

  // Progress bar
  const ProgressBar = () => (
    <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: colors.accent }}
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );

  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center p-4"
      >
        <RingAnimation />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <motion.div
        className="flex flex-col items-center space-y-6"
        variants={logoVariants}
        initial="hidden"
        animate="visible"
      >
        {showLogo && (
          <>
            <WingAnimation />
            
            {/* Brand Name */}
            <motion.div
              className="text-center"
              variants={textVariants}
            >
              <h1 
                className="text-4xl font-bold mb-2"
                style={{ color: colors.primary }}
              >
                Ring & Wing
              </h1>
              <p 
                className="text-lg"
                style={{ color: colors.secondary }}
              >
                Management System
              </p>
            </motion.div>
          </>
        )}

        {!showLogo && <RingAnimation />}

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <ProgressBar />
        </motion.div>

        {/* Loading Message */}
        {message && (
          <motion.p
            className="text-center font-medium"
            style={{ color: colors.accent }}
            variants={textVariants}
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

BrandedLoadingScreen.propTypes = {
  message: PropTypes.string,
  showLogo: PropTypes.bool,
  variant: PropTypes.oneOf(['full', 'minimal'])
};

export default BrandedLoadingScreen;
