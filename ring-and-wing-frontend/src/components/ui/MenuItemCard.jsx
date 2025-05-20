import { theme } from '../../theme';
import { motion } from 'framer-motion';

export const MenuItemCard = ({ item, onClick }) => {
  const basePrice = item.pricing.base || Object.values(item.pricing)[0];
  
  // Get a more readable display for pricing variants if available
  const hasSizeVariants = Object.keys(item.pricing).length > 1;
  const priceDisplay = typeof basePrice === 'number' ? basePrice.toFixed(0) : basePrice;
  
  return (
    <motion.div
      className="relative rounded-xl overflow-hidden cursor-pointer aspect-square group"
      onClick={onClick}
      whileHover={{ 
        scale: 1.03, 
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70 z-10"></div>
        {/* Item code badge */}
      <div 
        className="absolute top-2 left-2 rounded-full px-3 py-1.5 text-sm font-bold z-20 flex items-center justify-center"
        style={{ 
          backgroundColor: theme.colors.accent,
          color: theme.colors.background,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {item.code}
      </div>
      
      {/* Item image */}
      <div className="relative w-full h-full">
        <motion.div 
          className="w-full h-full"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.5 }}
        >
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails to load, use category-specific placeholder
                e.target.src = item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
              }}
            />
          ) : (
            <img 
              src={item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png'} 
              alt={item.name} 
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
      </div>

      {/* Item info overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
        <div className="flex flex-col">
          <h3 
            className="text-white font-bold leading-tight break-words text-shadow mb-1"
            style={{
              fontSize: theme.fontSizes.base,
              lineHeight: '1.2',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {item.name}
          </h3>
          
          <div className="flex justify-between items-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
              {item.category}
            </div>
            
            <div className="flex items-center">
              <div 
                className="px-2.5 py-1 rounded-full font-bold text-sm"
                style={{ 
                  backgroundColor: theme.colors.accent,
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                ₱{priceDisplay}
                {hasSizeVariants && '+'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-10"></div>
    </motion.div>
  );
};