import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../theme';

const AlternativeCard = ({ item, isRecommended, onAddToCart }) => {
  const basePrice = item.pricing?.base || Object.values(item.pricing || {})[0] || 0;
  const priceDisplay = typeof basePrice === 'number' ? basePrice.toFixed(0) : basePrice;
  
  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg overflow-hidden relative border border-gray-100"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div 
          className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full text-sm font-bold text-white shadow-md"
          style={{ backgroundColor: theme.colors.primary }}
        >
          RECOMMENDED
        </div>
      )}
      
      {/* Layout: Image on left, content on right for mobile */}
      <div className="flex p-4">
        {/* Item Image */}
        <div className="w-24 h-24 flex-shrink-0 mr-4">
          <img 
            src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
            alt={item.name}
            className="w-full h-full object-cover rounded-xl"
            onError={(e) => {
              e.target.src = item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
            }}
          />
        </div>
        
        {/* Item Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-base text-gray-900 leading-tight mb-1 line-clamp-2">
              {item.name}
            </h4>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{item.code}</span>
              <span 
                className="font-bold text-lg"
                style={{ color: theme.colors.primary }}
              >
                ₱{priceDisplay}
              </span>
            </div>
          </div>
          
          {/* Add to Cart Button */}
          <button
            onClick={() => onAddToCart(item)}
            className="w-full py-3 rounded-xl text-base font-semibold text-white transition-all duration-200 shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.colors.primary
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const AlternativesModal = ({ 
  isOpen, 
  onClose, 
  originalItem, 
  alternatives, 
  recommendedAlternative, 
  onAddToCart,
  loading = false 
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal - Responsive: Desktop center modal or Mobile bottom sheet */}
          <motion.div
            className={isDesktop 
              ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl max-h-[90vh] w-full max-w-4xl shadow-2xl"
              : "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] w-full shadow-2xl"
            }
            initial={isDesktop
              ? { scale: 0.9, opacity: 0 }
              : { y: '100%', opacity: 0 }
            }
            animate={isDesktop
              ? { scale: 1, opacity: 1 }
              : { y: 0, opacity: 1 }
            }
            exit={isDesktop
              ? { scale: 0.9, opacity: 0 }
              : { y: '100%', opacity: 0 }
            }
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 400
            }}
          >
            {/* Header */}
            <div className={isDesktop ? "p-6 pb-4 border-b border-gray-200 relative" : "p-4 pb-2 border-b border-gray-200 relative"}>
              {/* Pull indicator - mobile only */}
              {!isDesktop && <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full"></div>}
              
              <div className={isDesktop ? "flex items-start justify-between" : "flex items-start justify-between mt-3"}>
                <div className="flex-1 pr-4">
                  <div className="flex items-center mb-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      Item Unavailable
                    </h2>
                  </div>
                  <p className="text-base text-gray-600 mb-2 leading-relaxed">
                    <span className="font-semibold">"{originalItem?.name}"</span> is currently unavailable
                  </p>
                  {alternatives?.length > 0 ? (
                    <p className="text-base font-medium" style={{ color: theme.colors.primary }}>
                      Here are some similar options:
                    </p>
                  ) : (
                    <p className="text-base text-gray-500">
                      Please check back later or browse other items.
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className={isDesktop ? "px-6 py-4 flex-1 overflow-y-auto" : "px-4 py-2 flex-1 overflow-y-auto"} style={{ maxHeight: isDesktop ? 'calc(90vh - 180px)' : 'calc(85vh - 140px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-3" style={{ borderColor: theme.colors.primary }}></div>
                  <span className="ml-3 text-lg text-gray-600">Loading alternatives...</span>
                </div>
              ) : alternatives?.length > 0 ? (
                <div className={isDesktop ? "grid grid-cols-2 gap-5 pb-4" : "grid grid-cols-1 gap-4 pb-4"}>

                  {alternatives.map((item) => (
                    <AlternativeCard
                      key={item._id}
                      item={item}
                      isRecommended={item._id === recommendedAlternative?._id}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">...</div>
                  <p className="text-lg text-gray-600 mb-4 font-medium">
                    No similar items are currently available.
                  </p>
                  <p className="text-base text-gray-500">
                    Please check back later or explore our other menu sections.
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className={isDesktop ? "p-6 pt-4 border-t border-gray-200 bg-gray-50" : "p-4 pt-2 border-t border-gray-200 bg-gray-50"}>
              <button
                onClick={onClose}
                className="w-full py-4 px-6 rounded-xl border-2 font-semibold transition-all duration-200 text-lg"
                style={{
                  borderColor: theme.colors.primary,
                  color: theme.colors.primary,
                  backgroundColor: 'white'
                }}
              >
                ← Back to Menu
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
