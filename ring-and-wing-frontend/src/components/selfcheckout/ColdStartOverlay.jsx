import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

const colors = {
  primary: '#2e0304',
  accent: '#f1670f',
  secondary: '#853619',
  background: '#fefdfd',
  muted: '#ac9c9b'
};

/**
 * ColdStartOverlay - Displays a friendly loading screen during server cold starts
 * Designed for Render free tier which spins down after inactivity
 */
const ColdStartOverlay = ({
  isVisible,
  retryCount = 0,
  maxRetries = 5,
  estimatedWaitTime = null,
  onDismiss = null
}) => {
  // Calculate progress percentage
  const progress = maxRetries > 0 ? ((retryCount / maxRetries) * 100) : 0;

  // Rotating ring animation component
  const LoadingRing = () => (
    <div className="relative w-20 h-20">
      {/* Outer ring - static */}
      <div 
        className="absolute inset-0 border-4 rounded-full opacity-20"
        style={{ borderColor: colors.accent }}
      />
      
      {/* Animated ring segment */}
      <motion.div
        className="absolute inset-0 border-4 border-transparent rounded-full"
        style={{ borderTopColor: colors.accent, borderRightColor: colors.accent }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Inner ring - counter rotate */}
      <motion.div
        className="absolute inset-3 border-3 border-transparent rounded-full"
        style={{ borderBottomColor: colors.secondary }}
        animate={{ rotate: -360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Center icon - coffee cup */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg 
          className="w-8 h-8" 
          fill="none" 
          stroke={colors.primary} 
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" 
          />
        </svg>
      </div>
    </div>
  );

  // Server icon
  const ServerIcon = () => (
    <svg 
      className="w-5 h-5 mr-2" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" 
      />
    </svg>
  );

  // Lightbulb tip icon
  const TipIcon = () => (
    <svg 
      className="w-4 h-4 mr-2 flex-shrink-0" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" 
      />
    </svg>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(46, 3, 4, 0.97)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            {/* Logo/Brand */}
            <h1 
              className="text-2xl font-bold mb-6"
              style={{ color: colors.primary }}
            >
              Ring & Wings
            </h1>

            {/* Loading Animation */}
            <div className="flex justify-center mb-6">
              <LoadingRing />
            </div>

            {/* Status Message */}
            <div className="mb-4">
              <h2 
                className="text-lg font-semibold mb-2 flex items-center justify-center"
                style={{ color: colors.primary }}
              >
                <ServerIcon />
                Waking Up the Kitchen...
              </h2>
              <p 
                className="text-sm"
                style={{ color: colors.secondary }}
              >
                {estimatedWaitTime 
                  ? `This may take up to ${estimatedWaitTime} seconds.`
                  : 'This may take up to 2 minutes.'}
              </p>
              <p 
                className="text-sm mt-1"
                style={{ color: colors.muted }}
              >
                Thank you for your patience!
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: colors.accent }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max(progress, 10)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p 
                className="text-xs mt-2"
                style={{ color: colors.muted }}
              >
                Attempt {retryCount} of {maxRetries}
              </p>
            </div>

            {/* Tip Box */}
            <div 
              className="rounded-lg p-3 text-left"
              style={{ backgroundColor: `${colors.accent}10` }}
            >
              <p 
                className="text-xs flex items-start"
                style={{ color: colors.secondary }}
              >
                <TipIcon />
                <span>
                  Our server sleeps to conserve energy when not in use. 
                  It will be ready shortly!
                </span>
              </p>
            </div>

            {/* Optional dismiss button (for debugging) */}
            {onDismiss && process.env.NODE_ENV === 'development' && (
              <button
                onClick={onDismiss}
                className="mt-4 text-xs underline"
                style={{ color: colors.muted }}
              >
                Dismiss (dev only)
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

ColdStartOverlay.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  retryCount: PropTypes.number,
  maxRetries: PropTypes.number,
  estimatedWaitTime: PropTypes.number,
  onDismiss: PropTypes.func
};

export default ColdStartOverlay;
