import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { API_URL } from '../../App';

// Add scrolling animation styles
const scrollStyle = `
  @keyframes scroll-text {
    0% { transform: translateX(0); }
    50% { transform: translateX(calc(-100% + 180px)); }
    100% { transform: translateX(0); }
  }
  .animate-scroll {
    animation: scroll-text infinite linear;
    animation-play-state: running;
  }
  .animate-scroll:hover {
    animation-play-state: paused;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = scrollStyle;
  if (!document.head.querySelector('style[data-scroll-animation]')) {
    styleElement.setAttribute('data-scroll-animation', 'true');
    document.head.appendChild(styleElement);
  }
}

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b'
};

// AI Avatar Component
const AIAvatar = ({ isListening = false, isThinking = false, size = 'default' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-10 h-10',
    large: 'w-12 h-12'
  };
  
  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-5 h-5', 
    large: 'w-6 h-6'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 ${
      isListening ? 'animate-pulse' : isThinking ? 'animate-spin' : ''
    }`} style={{ backgroundColor: colors.accent }}>
      <svg 
        className={`${iconSizes[size]} text-white`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
        />
      </svg>
    </div>
  );
};

AIAvatar.propTypes = {
  isListening: PropTypes.bool,
  isThinking: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'default', 'large'])
};

// Dialog Customization Component - Handles size, variants, and add-ons with buttons
const DialogCustomization = ({ item, addOns = [], initialSize = null, onComplete, onCancel }) => {
  const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
  const variants = item.variants || [];
  
  // Get unique add-ons (filter duplicates by name)
  // More flexible matching: check if addon applies to this item's category or is universal
  const relevantAddOns = (addOns || []).filter(addon => {
    const addonCat = (addon.category || '').toLowerCase();
    const itemCat = (item.category || '').toLowerCase();
    const itemSubCat = (item.subCategory || '').toLowerCase();
    
    // Match if: addon is for 'All', categories match, or addon is for Beverages and item is a beverage type
    return addonCat === 'all' || 
           addonCat === itemCat || 
           addonCat === itemSubCat ||
           (addonCat === 'beverages' && (itemCat.includes('beverage') || itemSubCat.includes('frappe') || itemSubCat.includes('milk') || itemSubCat.includes('tea') || itemSubCat.includes('lemonade')));
  });
  const uniqueAddOns = relevantAddOns.reduce((acc, addon) => {
    if (!acc.find(a => a.name === addon.name)) {
      acc.push(addon);
    }
    return acc;
  }, []);
  
  // Check if we have an initial size to pre-select
  const preSelectedSize = initialSize 
    ? sizes.find(s => s.toLowerCase() === initialSize.toLowerCase() || s.toLowerCase().startsWith(initialSize.toLowerCase()))
    : (sizes.length === 1 ? sizes[0] : null);
  
  const [selectedSize, setSelectedSize] = useState(preSelectedSize);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [step, setStep] = useState('size'); // 'size', 'variant', 'addons', 'confirm'
  
  // Determine initial step based on pre-selected size or single size
  useEffect(() => {
    if (preSelectedSize) {
      // Size already selected, skip to next step
      if (variants.length > 0) {
        setStep('variant');
      } else if (uniqueAddOns.length > 0) {
        setStep('addons');
      } else {
        // No further customization needed, complete immediately
        onComplete({ size: preSelectedSize });
      }
    }
  }, []);
  
  const toggleAddOn = (addon) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.name === addon.name);
      if (exists) {
        return prev.filter(a => a.name !== addon.name);
      }
      return [...prev, addon];
    });
  };
  
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    if (variants.length > 0) {
      setStep('variant');
    } else if (uniqueAddOns.length > 0) {
      setStep('addons');
    } else {
      onComplete({ size });
    }
  };
  
  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    if (uniqueAddOns.length > 0) {
      setStep('addons');
    } else {
      onComplete({ size: selectedSize, variant: variant.name });
    }
  };
  
  const handleAddOnsConfirm = () => {
    onComplete({
      size: selectedSize,
      variant: selectedVariant?.name,
      addOns: selectedAddOns
    });
  };
  
  const handleSkipAddOns = () => {
    onComplete({
      size: selectedSize,
      variant: selectedVariant?.name,
      addOns: []
    });
  };
  
  // Calculate total price
  const basePrice = selectedSize ? (item.pricing[selectedSize] || 0) : 0;
  const variantPrice = selectedVariant?.priceAdjustment || 0;
  const addOnsPrice = selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalPrice = basePrice + variantPrice + addOnsPrice;
  
  return (
    <div className="flex gap-2">
      <AIAvatar size="small" />
      <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-3 max-w-sm">
        {/* Item Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
            <img 
              src={item.image || '/placeholders/meal.png'} 
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = '/placeholders/meal.png'; }}
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
            {selectedSize && (
              <p className="text-xs text-orange-600">
                {selectedSize}{selectedVariant ? ` • ${selectedVariant.name}` : ''} 
                {selectedAddOns.length > 0 && ` • +${selectedAddOns.length} add-on${selectedAddOns.length > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>
        
        {/* Size Selection */}
        {step === 'size' && sizes.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 font-medium">Choose size:</p>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-sm"
                >
                  <span className="font-medium text-gray-700 capitalize">{size}</span>
                  <span className="font-bold text-orange-600">₱{item.pricing[size]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Variant Selection */}
        {step === 'variant' && variants.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 font-medium">Choose flavor:</p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map(variant => (
                <button
                  key={variant.name}
                  onClick={() => handleVariantSelect(variant)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-sm text-center"
                >
                  <span className="font-medium text-gray-700">{variant.name}</span>
                  {variant.priceAdjustment > 0 && (
                    <span className="text-xs text-orange-600 ml-1">+₱{variant.priceAdjustment}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Add-ons Selection */}
        {step === 'addons' && uniqueAddOns.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 font-medium">Add extras? (optional)</p>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {uniqueAddOns.map(addon => {
                const isSelected = selectedAddOns.find(a => a.name === addon.name);
                return (
                  <button
                    key={addon.name}
                    onClick={() => toggleAddOn(addon)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${
                      isSelected 
                        ? 'bg-orange-100 border-2 border-orange-400' 
                        : 'bg-white border border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-gray-700">{addon.name}</span>
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>
                      +₱{addon.price || 0}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Add-ons action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSkipAddOns}
                className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleAddOnsConfirm}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {selectedAddOns.length > 0 ? `Add (₱${totalPrice})` : 'Continue'}
              </button>
            </div>
          </div>
        )}
        
        {/* Cancel button (for size/variant steps) */}
        {(step === 'size' || step === 'variant') && (
          <button
            onClick={onCancel}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

DialogCustomization.propTypes = {
  item: PropTypes.object.isRequired,
  addOns: PropTypes.array,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

// Text formatting helper - converts **text** to bold and highlights prices/menu names
const FormattedText = ({ text, menuItems = [] }) => {
  if (!text) return null;
  
  // First, handle explicit **bold** markers
  let parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  const elements = parts.map((part, index) => {
    // Handle **bold** syntax
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={index} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </span>
      );
    }
    
    // For non-bold parts, highlight prices and menu items
    // Match prices like ₱123, ₱45.00, etc.
    const priceRegex = /(₱[\d,]+(?:\.\d{2})?)/g;
    const subParts = part.split(priceRegex);
    
    return subParts.map((subPart, subIndex) => {
      // Highlight prices in orange
      if (priceRegex.test(subPart) || subPart.match(/^₱[\d,]+(?:\.\d{2})?$/)) {
        return (
          <span key={`${index}-${subIndex}`} className="font-bold text-orange-600">
            {subPart}
          </span>
        );
      }
      
      // Check if this part contains a menu item name and highlight it
      let highlightedPart = subPart;
      let hasMatch = false;
      
      for (const item of menuItems) {
        const itemName = item.name;
        const regex = new RegExp(`\\b${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(highlightedPart)) {
          hasMatch = true;
          const splitParts = highlightedPart.split(regex);
          const matches = highlightedPart.match(regex) || [];
          
          return splitParts.reduce((acc, splitPart, splitIdx) => {
            acc.push(<span key={`${index}-${subIndex}-${splitIdx}-text`}>{splitPart}</span>);
            if (matches[splitIdx]) {
              acc.push(
                <span key={`${index}-${subIndex}-${splitIdx}-match`} className="font-semibold text-gray-800">
                  {matches[splitIdx]}
                </span>
              );
            }
            return acc;
          }, []);
        }
      }
      
      return <span key={`${index}-${subIndex}`}>{subPart}</span>;
    });
  });
  
  return <>{elements}</>;
};

FormattedText.propTypes = {
  text: PropTypes.string,
  menuItems: PropTypes.array
};

// Size Selection Component
const SizeSelectionMessage = ({ item, onSelectSize, onCancel }) => {
  const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
  
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          <img 
            src={item.image || '/placeholders/meal.png'} 
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/placeholders/meal.png'; }}
          />
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">{item.name}</h4>
          <p className="text-xs text-gray-500">Select your preferred size:</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {sizes.map(size => (
          <button
            key={size}
            onClick={() => onSelectSize(item, size)}
            className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all"
          >
            <span className="font-medium text-gray-700 capitalize">{size}</span>
            <span className="font-bold text-orange-600">₱{item.pricing[size]}</span>
          </button>
        ))}
      </div>
      
      <button
        onClick={onCancel}
        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

SizeSelectionMessage.propTypes = {
  item: PropTypes.object.isRequired,
  onSelectSize: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

// Enhanced Message Component with suggestions, photos, and expandable descriptions
const ChatMessage = ({ message, onAddToCart, onManualTap, onSelectSize, onCancelSize, onCustomizationComplete, onCustomizationCancel, addOns = [], menuItems = [] }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handle dialog customization message type (size + variant + add-ons with buttons)
  if (message.type === 'dialog-customization' && message.pendingItem) {
    return (
      <DialogCustomization
        item={message.pendingItem}
        addOns={addOns}
        initialSize={message.initialSize}
        onComplete={(options) => onCustomizationComplete(message.pendingItem, options)}
        onCancel={onCustomizationCancel}
      />
    );
  }

  if (message.type === 'menu-suggestions') {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <AIAvatar size="small" />
          <div className="max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl bg-gray-100 text-gray-800">
            <p className="text-sm leading-relaxed">
              <FormattedText text={message.text} menuItems={menuItems} />
            </p>
          </div>
        </div>
        
        {/* Menu suggestions with photos */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="ml-9 space-y-3 max-w-sm">
            {message.suggestions.map((suggestion, index) => {
              const menuItem = menuItems.find(item => 
                item._id === suggestion._id || 
                item.name.toLowerCase() === suggestion.name.toLowerCase()
              );
              
              if (!menuItem) return null;

              const description = suggestion.description || menuItem.description || '';
              const isExpanded = expandedItems.has(menuItem._id);
              const shouldShowExpand = description.length > 35; // Short limit for standard container
              const displayDescription = shouldShowExpand && !isExpanded 
                ? truncateText(description, 35) // Truncate to fit standard container
                : description;
              
              return (
                <div
                  key={index}
                  className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all duration-200 hover:shadow-md overflow-hidden cursor-pointer min-w-[280px] w-full max-w-sm"
                  onClick={() => onManualTap ? onManualTap(menuItem) : onAddToCart(menuItem)}
                >
                  {/* Conditional layout based on expanded state */}
                  {!isExpanded ? (
                    /* Horizontal layout with photo when collapsed */
                    <div className="flex items-start gap-3 p-3">
                      {/* Square Menu Item Photo on the left */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                        <img 
                          src={menuItem.image || (menuItem.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')} 
                          alt={suggestion.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.target.src = menuItem.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
                          }}
                        />
                      </div>
                      
                      {/* Content on the right */}
                      <div className="flex-1 flex items-start justify-between">
                      <div className="flex-1 pr-2 overflow-hidden">
                        {/* Title with auto-scroll for long text */}
                        <div className="relative overflow-hidden h-5 mb-1">
                          <h4 
                            className={`font-medium text-gray-800 text-sm leading-tight whitespace-nowrap ${
                              suggestion.name.length > 25 ? 'animate-scroll' : ''
                            }`}
                            title={suggestion.name}
                            style={{
                              animationDuration: suggestion.name.length > 25 ? `${Math.max(3, suggestion.name.length * 0.15)}s` : undefined
                            }}
                          >
                            {suggestion.name}
                          </h4>
                        </div>                          {/* Description with expand/collapse */}
                          {description && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-600 leading-relaxed break-words">
                                {displayDescription}
                              </p>
                              {shouldShowExpand && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(menuItem._id);
                                  }}
                                  className="text-orange-600 hover:text-orange-700 text-xs font-medium mt-1 flex items-center gap-1 transition-colors"
                                >
                                  <span>Show more</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Price and Add button on the right */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-orange-600 text-sm">₱{suggestion.price}</p>
                          <p className="text-xs text-gray-500">{suggestion.defaultSize || 'Regular'}</p>
                          <div className="mt-1 text-orange-600 text-xs font-medium">
                            + Add
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Expanded layout without photo - text only */
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4 overflow-hidden">
                          {/* Title with auto-scroll for long text */}
                          <div className="relative overflow-hidden h-5 mb-2">
                            <h4 
                              className={`font-medium text-gray-800 text-sm leading-tight whitespace-nowrap ${
                                suggestion.name.length > 25 ? 'animate-scroll' : ''
                              }`}
                              title={suggestion.name}
                              style={{
                                animationDuration: suggestion.name.length > 25 ? `${Math.max(3, suggestion.name.length * 0.15)}s` : undefined
                              }}
                            >
                              {suggestion.name}
                            </h4>
                          </div>
                          
                          {/* Full description */}
                          {description && (
                            <div>
                              <p className="text-xs text-gray-600 leading-relaxed mb-3 break-words">
                                {description}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(menuItem._id);
                                }}
                                className="text-orange-600 hover:text-orange-700 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <span>Show less</span>
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Price and Add button on the right */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-orange-600 text-sm">₱{suggestion.price}</p>
                          <p className="text-xs text-gray-500">{suggestion.defaultSize || 'Regular'}</p>
                          <div className="mt-1 text-orange-600 text-xs font-medium">
                            + Add
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Handle size selection message type
  if (message.type === 'size-selection' && message.pendingItem) {
    return (
      <div className="flex gap-3">
        <AIAvatar size="small" />
        <div className="flex-1">
          <SizeSelectionMessage
            item={message.pendingItem}
            onSelectSize={onSelectSize}
            onCancel={onCancelSize}
          />
        </div>
      </div>
    );
  }

  // Handle cart modification confirmation
  if (message.type === 'cart-action') {
    return (
      <div className="flex gap-3">
        <AIAvatar size="small" />
        <div className="max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl bg-orange-50 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-orange-800">Done!</span>
          </div>
          <p className="text-sm text-orange-700">
            <FormattedText text={message.text} menuItems={menuItems} />
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex gap-3">
      {message.sender === 'bot' && <AIAvatar size="small" isThinking={message.isThinking} />}
      <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${
        message.sender === 'user' 
          ? 'ml-auto' 
          : 'mr-auto bg-gray-100 text-gray-800'
      }`} style={{
        backgroundColor: message.sender === 'user' ? colors.accent : undefined,
        color: message.sender === 'user' ? 'white' : undefined
      }}>
        <p className="text-sm leading-relaxed">
          {message.sender === 'bot' ? (
            <FormattedText text={message.text} menuItems={menuItems} />
          ) : (
            message.text
          )}
        </p>
        {message.timestamp && (
          <p className="text-xs opacity-70 mt-1">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>
    </div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.string.isRequired,
    sender: PropTypes.oneOf(['user', 'bot']).isRequired,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    type: PropTypes.string,
    suggestions: PropTypes.array,
    pendingItem: PropTypes.object,
    isThinking: PropTypes.bool
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
  onManualTap: PropTypes.func,
  onSelectSize: PropTypes.func,
  onCancelSize: PropTypes.func,
  onCustomizationComplete: PropTypes.func,
  onCustomizationCancel: PropTypes.func,
  addOns: PropTypes.array,
  menuItems: PropTypes.array
};

// Main AssistantPanel Component with full AI functionality
const AssistantPanel = ({ 
  menuItems = [], 
  currentOrder = [], 
  addOns = [],
  onAddToCart = () => {},
  onRequestCustomization = null,
  onRemoveFromCart = () => {},
  onUpdateQuantity = () => {},
  onUpdateSize = () => {},
  onClearCart = () => {},
  onOrderSuggestion = () => {},
  onOpenChange = () => {},
  onSubmitOrder = null,
  isAuthenticated = false,
  cartTotal = 0,
  bottomClass = ''
}) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSizeSelection, setPendingSizeSelection] = useState(null);
  const [lastSuggestedItems, setLastSuggestedItems] = useState([]); // Track last AI suggestions for context
  const [conversationContext, setConversationContext] = useState(null); // Track conversation state
  
  // Notify parent when assistant opens/closes
  useEffect(() => {
    onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);
  
  const [categories, setCategories] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! Ready to order? Here are some popular choices:",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
      suggestions: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const hasAddedInitialSuggestionsRef = useRef(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Generate unique ID for messages
  const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch categories for context
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/api/categories`);
        if (response.ok) {
          const categoriesData = await response.json();
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback categories
        setCategories([
          { category: 'Combo Meals', subCategories: [] },
          { category: 'Wings', subCategories: [] },
          { category: 'Rice Meals', subCategories: [] },
          { category: 'Beverages', subCategories: [] }
        ]);
      }
    };

    fetchCategories();
  }, []);

  // Get initial meal suggestions - popular/featured items
  const getInitialSuggestions = () => {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }
    
    // Filter available items
    const availableItems = menuItems.filter(item => 
      item.isAvailable !== false && 
      item.name && 
      item.pricing && 
      Object.keys(item.pricing).length > 0
    );
    
    if (availableItems.length === 0) {
      return [];
    }
    
    const suggestions = [];
    const usedIds = new Set();
    
    // Dynamic priority categories
    const getDynamicPriorityCategories = () => {
      if (categories.length > 0) {
        return categories.map((cat, index) => ({
          categoryName: cat.category,
          priority: index + 1,
          keywords: [cat.category.toLowerCase()],
          subKeywords: cat.subCategories || []
        }));
      }
      
      return [
        { keywords: ['combo', 'solo'], priority: 1, categoryName: 'Combo' }, 
        { keywords: ['wings', 'chicken'], priority: 2, categoryName: 'Wings' }, 
        { keywords: ['rice', 'meal'], priority: 3, categoryName: 'Meals' }, 
        { keywords: ['drink', 'beverage'], priority: 4, categoryName: 'Beverages' }
      ];
    };
    
    const priorityCategories = getDynamicPriorityCategories();
    
    // Sort items by priority and price
    const categorizedItems = availableItems.map(item => {
      const itemName = item.name.toLowerCase();
      const itemCategory = (item.category || '').toLowerCase();
      const pricing = item.pricing || {};
      const basePrice = Math.min(...Object.values(pricing));
      
      let priority = 999;
      for (const cat of priorityCategories) {
        if (cat.categoryName && itemCategory === cat.categoryName.toLowerCase()) {
          priority = cat.priority;
          break;
        }
        
        if (cat.keywords && cat.keywords.some(keyword => itemName.includes(keyword))) {
          priority = cat.priority;
          break;
        }
        
        if (cat.subKeywords && cat.subKeywords.some(subCat => 
          itemName.includes(subCat.toLowerCase()) || item.subCategory === subCat
        )) {
          priority = cat.priority;
          break;
        }
      }
      
      return {
        ...item,
        priority,
        basePrice,
        defaultSize: Object.keys(pricing).includes('base') ? 'base' : Object.keys(pricing)[0] || 'regular'
      };
    }).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.basePrice - b.basePrice;
    });
    
    // Select diverse suggestions (max 2)
    for (const item of categorizedItems) {
      if (suggestions.length >= 2) break;
      if (usedIds.has(item._id)) continue;
      
      suggestions.push({
        ...item,
        price: item.basePrice
      });
      usedIds.add(item._id);
    }
    
    // Failsafe: if still no suggestions, take first 2 available items
    if (suggestions.length === 0 && availableItems.length > 0) {
      for (let i = 0; i < Math.min(2, availableItems.length); i++) {
        const item = availableItems[i];
        const pricing = item.pricing || {};
        const basePrice = Math.min(...Object.values(pricing));
        
        suggestions.push({
          ...item,
          price: basePrice,
          defaultSize: Object.keys(pricing).includes('base') ? 'base' : Object.keys(pricing)[0] || 'regular'
        });
      }
    }
    
    return suggestions;
  };

  // Add initial suggestions when menu items are loaded
  useEffect(() => {
    if (menuItems.length > 0 && !hasAddedInitialSuggestionsRef.current) {
      const initialSuggestions = getInitialSuggestions();
      if (initialSuggestions.length > 0) {
        setMessages(prev => [
          ...prev,
          {
            id: generateUniqueId(),
            text: "Here are some popular items to get you started!",
            sender: 'bot',
            timestamp: new Date(),
            type: 'menu-suggestions',
            suggestions: initialSuggestions
          }
        ]);
        hasAddedInitialSuggestionsRef.current = true;
      }
    }
  }, [menuItems]);

  // Get AI response using Gemini integration
  const getAIResponse = async (userInput, signal = null) => {
    const menuContext = menuItems.map(item => {
      const prices = item.pricing ? 
        Object.entries(item.pricing)
          .map(([size, price]) => `${size}: ₱${price}`)
          .join(', ')
        : 'Price not available';
      
      return `- ${item.name}: ${item.description || 'No description'}. Prices: ${prices}. Category: ${item.category || 'Uncategorized'}. SubCategory: ${item.subCategory || 'None'}. Available: ${item.isAvailable !== false}`;
    }).join('\n');

    const categoryContext = categories.length > 0 
      ? `\n\nMENU CATEGORIES:\n${categories.map(cat => 
          `${cat.category}: ${cat.subCategories.length > 0 ? cat.subCategories.join(', ') : 'No subcategories'}`
        ).join('\n')}`
      : '';

    const currentOrderContext = currentOrder.length > 0 
      ? `Current cart (${currentOrder.length} items, total ₱${cartTotal.toFixed(2)}): ${currentOrder.map(item => `${item.name} (${item.selectedSize}) x${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)}`).join(', ')}`
      : 'No items in cart yet';

    const systemMessage = {
      role: "system",
      content: `You are Ringo, Ring & Wings restaurant's friendly AI assistant. You have a warm, casual personality and you're here to help customers with anything!

CURRENT MENU:
${menuContext}${categoryContext}

CUSTOMER'S CART:
${currentOrderContext}

YOUR PERSONALITY:
- You're Ringo, the friendly AI ordering buddy at Ring & Wings!
- Be warm, playful, and genuinely helpful
- Have natural conversations - you're not a robot!
- If someone asks random questions, chat naturally then gently steer back to food
- Never give robotic "I'm here to help" responses - be dynamic!
- You can joke around and have personality

FORMATTING RULES:
- Use **double asterisks** around menu item names to make them bold (e.g., **Buffalo Wings**)
- Always include the price after the item name in this format: **Item Name** (₱price)

RESPONSE GUIDELINES:
1. Keep responses conversational and short (2-3 sentences for mobile)
2. When suggesting items, format as: **Item Name** (₱price)
3. If asked non-food questions, answer naturally then pivot: "By the way, have you tried our...?"
4. Never deflect with generic "What can I get you?" - always add something interesting!
5. If items are unavailable, suggest alternatives with empathy
6. Be proactive with complementary suggestions (drinks with meals, sides, etc.)

CRITICAL - SIZE AND CONTEXT HANDLING:
- When user mentions an item, ONLY suggest that specific item, not alternatives
- If user says "iced spanish cafe" - suggest ONLY Iced Spanish Cafe Latte, not the hot version
- If user says "medium" or "large" after you mentioned sizes, understand they're choosing a size
- When a user specifies a size, CONFIRM the order, don't ask more questions
- Example: User: "iced spanish cafe pls" → You: "Perfect! **Iced Spanish Cafe Latte** - Medium (₱90) or Large (₱110)?" → User: "medium" → You: "Great! Adding Medium Iced Spanish Cafe Latte!"

CART MODIFICATION:
- Users can ask to remove items, change sizes, or clear their cart
- When they want to modify, confirm what you understood and handle the action

EXAMPLE NATURAL CONVERSATIONS:
- "hello" → "Hey there! 👋 Welcome to Ring & Wings! Craving something crispy or maybe a cold drink?"
- "I want iced spanish cafe" → "Awesome choice! **Iced Spanish Cafe Latte** comes in Medium (₱90) or Large (₱110). Which size?"
- "medium" → "Perfect! Adding your **Iced Spanish Cafe Latte** (Medium - ₱90)! Anything else?"
- "Remove the wings" → "Got it! Removing those wings from your cart. Anything else?"`
    };

    const payload = {
      model: "gemini-2.5-flash",
      messages: [
        systemMessage,
        { role: "user", content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 400
    };

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: signal
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.error || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      console.error("AI Assistant Error:", error);
      return "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
    }
  };

  // Extract menu suggestions from AI response
  const extractMenuSuggestions = (aiResponse, context = {}) => {
    const suggestions = [];
    
    // Look for menu items mentioned in the AI response
    menuItems.forEach(item => {
      const itemNameLower = item.name.toLowerCase();
      const responseLower = aiResponse.toLowerCase();
      
      // Check if item is mentioned and available
      if (responseLower.includes(itemNameLower) && item.isAvailable !== false) {
        const pricing = item.pricing || {};
        const sizes = Object.keys(pricing);
        const basePrice = sizes.length > 0 ? Math.min(...Object.values(pricing)) : 0;
        
        suggestions.push({
          ...item,
          price: basePrice,
          defaultSize: sizes.includes('base') ? 'base' : sizes[0] || 'regular'
        });
      }
    });

    // If this is an alternatives response, prioritize system alternatives
    if (context.systemAlternatives && context.systemAlternatives.length > 0) {
      const systemSuggestions = context.systemAlternatives
        .filter(alt => alt.isAvailable !== false)
        .map(alt => {
          const pricing = alt.pricing || {};
          const sizes = Object.keys(pricing);
          const basePrice = sizes.length > 0 ? Math.min(...Object.values(pricing)) : 0;
          
          return {
            ...alt,
            price: basePrice,
            defaultSize: sizes.includes('base') ? 'base' : sizes[0] || 'regular',
            isSystemAlternative: true
          };
        });
      
      // Merge system alternatives with AI-suggested items
      const uniqueSuggestions = [...systemSuggestions];
      suggestions.forEach(suggestion => {
        if (!systemSuggestions.find(sys => sys._id === suggestion._id)) {
          uniqueSuggestions.push(suggestion);
        }
      });
      
      return uniqueSuggestions.slice(0, 4);
    }

    return suggestions.slice(0, 4);
  };

  // Utility functions for intent detection
  const detectUnavailableItemIntent = (text) => {
    const unavailableKeywords = ['not available', 'out of stock', 'unavailable', 'don\'t have'];
    return unavailableKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  // Cart modification intent detection
  const detectCartModificationIntent = (text) => {
    const lowerText = text.toLowerCase();
    
    const intents = {
      remove: ['remove', 'delete', 'take out', 'cancel', 'get rid of', 'don\'t want', 'take off'],
      changeSize: ['change size', 'make it', 'switch to large', 'switch to medium', 'switch to small', 'larger', 'smaller', 'upsize', 'downsize'],
      changeQuantity: ['add more', 'add another', 'one more', 'increase', 'decrease', 'less of', 'more of'],
      clear: ['clear cart', 'empty cart', 'start over', 'remove all', 'clear everything', 'empty my cart', 'remove everything']
    };
    
    for (const [action, keywords] of Object.entries(intents)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        return { action, input: lowerText };
      }
    }
    return null;
  };

  // Find matching cart item from user input
  const findCartItemFromInput = (text) => {
    const lowerText = text.toLowerCase();
    
    // Check each cart item
    for (const cartItem of currentOrder) {
      const itemNameLower = cartItem.name.toLowerCase();
      
      // Check for exact or partial match
      if (lowerText.includes(itemNameLower)) {
        return cartItem;
      }
      
      // Check for key words in item name
      const itemWords = itemNameLower.split(' ');
      for (const word of itemWords) {
        if (word.length > 3 && lowerText.includes(word)) {
          return cartItem;
        }
      }
    }
    
    return null;
  };

  // Handle cart modification actions
  const handleCartModification = (intent, userInput) => {
    const { action } = intent;
    
    if (action === 'clear') {
      onClearCart();
      return {
        success: true,
        message: "Done! I've cleared your cart. Ready to start a fresh order? 🛒",
        type: 'cart-action'
      };
    }
    
    if (action === 'remove') {
      const cartItem = findCartItemFromInput(userInput);
      if (cartItem) {
        onRemoveFromCart(cartItem._id, cartItem.selectedSize);
        return {
          success: true,
          message: `Removed **${cartItem.name}** (${cartItem.selectedSize}) from your cart!`,
          type: 'cart-action'
        };
      } else {
        return {
          success: false,
          message: "I couldn't find that item in your cart. Could you tell me the exact name?",
          type: 'text'
        };
      }
    }
    
    if (action === 'changeQuantity') {
      const cartItem = findCartItemFromInput(userInput);
      if (cartItem) {
        const isIncrease = userInput.toLowerCase().match(/add|more|another|increase/);
        const delta = isIncrease ? 1 : -1;
        
        if (!isIncrease && cartItem.quantity <= 1) {
          return {
            success: false,
            message: `**${cartItem.name}** only has 1 in cart. Want me to remove it instead?`,
            type: 'text'
          };
        }
        
        onUpdateQuantity(cartItem._id, cartItem.selectedSize, delta);
        const newQty = cartItem.quantity + delta;
        return {
          success: true,
          message: `Updated! Now you have ${newQty}x **${cartItem.name}** in your cart.`,
          type: 'cart-action'
        };
      }
    }
    
    if (action === 'changeSize') {
      const cartItem = findCartItemFromInput(userInput);
      if (cartItem) {
        // Extract new size from input
        const sizes = cartItem.availableSizes || Object.keys(cartItem.pricing || {});
        const lowerInput = userInput.toLowerCase();
        
        let newSize = null;
        for (const size of sizes) {
          if (lowerInput.includes(size.toLowerCase())) {
            newSize = size;
            break;
          }
        }
        
        if (newSize && newSize !== cartItem.selectedSize) {
          onUpdateSize(cartItem._id, cartItem.selectedSize, newSize);
          return {
            success: true,
            message: `Changed **${cartItem.name}** to ${newSize} size! New price: ₱${cartItem.pricing[newSize]}`,
            type: 'cart-action'
          };
        } else {
          return {
            success: false,
            message: `What size would you like for **${cartItem.name}**? Available: ${sizes.join(', ')}`,
            type: 'text'
          };
        }
      }
    }
    
    return null;
  };

  const extractItemNameFromInput = (text) => {
    // Simple extraction - look for quoted text or common food words
    const quoted = text.match(/"([^"]+)"/);
    if (quoted) return quoted[1];
    
    // Look for menu item names in the input
    for (const item of menuItems) {
      if (text.toLowerCase().includes(item.name.toLowerCase())) {
        return item.name;
      }
    }
    
    return text; // Fallback
  };

  // Check if item needs full customization (has variants, add-ons, or multiple sizes)
  const needsCustomization = (item) => {
    const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
    const hasMultipleSizes = sizes.length > 1;
    const hasVariants = (item.variants || []).length > 0;
    const relevantAddOns = (addOns || []).filter(addon => 
      addon.category === item.category || addon.category === 'All'
    );
    const hasAddOns = relevantAddOns.length > 0;
    
    return hasMultipleSizes || hasVariants || hasAddOns;
  };

  // Handle MANUAL item tap (+ Add button) - opens modal for customization
  const handleManualItemTap = (item) => {
    // For manual taps, always open the customization modal if available
    if (onRequestCustomization && needsCustomization(item)) {
      onRequestCustomization(item);
      return;
    }
    
    // No customization needed or no modal available - add directly
    const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
    const size = sizes[0] || 'regular';
    onAddToCart(item, { size, skipCustomization: true });
    
    const confirmMessage = {
      id: generateUniqueId(),
      text: `Added **${item.name}** to your cart! 🎉 Anything else?`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'cart-action'
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  // Handle size selection for items - dialog-based approach
  const handleItemWithSizeSelection = (item) => {
    const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
    const hasVariants = (item.variants || []).length > 0;
    
    // Check for variants first
    if (hasVariants) {
      setPendingSizeSelection(item);
      setLastSuggestedItems([item]);
      
      const variantNames = item.variants.map(v => `**${v.name}**`).join(', ');
      let message = `**${item.name}** has these flavors: ${variantNames}.`;
      
      if (sizes.length > 1) {
        const sizeOptions = sizes.map(s => `${s} (₱${item.pricing[s]})`).join(', ');
        message += ` Sizes available: ${sizeOptions}. What flavor and size would you like?`;
      } else {
        message += ` Which flavor would you like?`;
      }
      
      const variantMessage = {
        id: generateUniqueId(),
        text: message,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, variantMessage]);
      return true;
    }
    
    if (sizes.length > 1) {
      // Multiple sizes - ask in conversation (dialog-based)
      setPendingSizeSelection(item);
      setLastSuggestedItems([item]);
      
      // Build size options string
      const sizeOptions = sizes.map(s => {
        const price = item.pricing[s];
        return `${s} (₱${price})`;
      }).join(' or ');
      
      const sizeMessage = {
        id: generateUniqueId(),
        text: `**${item.name}** comes in ${sizeOptions}. Which size would you like?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, sizeMessage]);
      return true; // Size selection needed
    }
    
    return false; // No size selection needed, proceed with add
  };

  // Handle size selection callback
  const handleSizeSelected = (item, size) => {
    setPendingSizeSelection(null);
    setLastSuggestedItems([]); // Clear so "yes" doesn't re-add
    setConversationContext(null);
    onAddToCart(item, { size, skipCustomization: true });
    
    // Add confirmation message
    const confirmMessage = {
      id: generateUniqueId(),
      text: `Added **${item.name}** (${size}) to your cart! 🎉`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'cart-action'
    };
    setMessages(prev => [...prev, confirmMessage]);
    
    // Suggest upsell after a short delay
    setTimeout(() => {
      suggestUpsell(item);
    }, 1000);
  };

  // Handle size selection cancel
  const handleSizeCancel = () => {
    setPendingSizeSelection(null);
    setLastSuggestedItems([]); // Clear context on cancel too
    setConversationContext(null);
    const cancelMessage = {
      id: generateUniqueId(),
      text: "No problem! Let me know if you'd like something else.",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  // Suggest upsell/cross-sell items
  const suggestUpsell = (addedItem) => {
    // Check if cart has drinks
    const hasDrink = currentOrder.some(item => item.category === 'Beverages');
    const isFood = addedItem.category !== 'Beverages';
    
    // Suggest drink if they added food but have no drinks
    if (isFood && !hasDrink) {
      const drinks = menuItems.filter(item => 
        item.category === 'Beverages' && 
        item.isAvailable !== false
      ).slice(0, 2);
      
      if (drinks.length > 0) {
        const drinkSuggestions = drinks.map(drink => {
          const pricing = drink.pricing || {};
          const sizes = Object.keys(pricing);
          const basePrice = sizes.length > 0 ? Math.min(...Object.values(pricing)) : 0;
          return {
            ...drink,
            price: basePrice,
            defaultSize: sizes[0] || 'regular'
          };
        });
        
        const upsellMessage = {
          id: generateUniqueId(),
          text: "🥤 How about a refreshing drink to go with that?",
          sender: 'bot',
          timestamp: new Date(),
          type: 'menu-suggestions',
          suggestions: drinkSuggestions
        };
        setMessages(prev => [...prev, upsellMessage]);
      }
    }
    
    // Check for combo upgrade opportunity
    const comboVersion = menuItems.find(item => 
      item.name.toLowerCase().includes(addedItem.name.toLowerCase()) && 
      item.name.toLowerCase().includes('combo') &&
      item.isAvailable !== false
    );
    
    if (comboVersion && comboVersion._id !== addedItem._id) {
      const pricing = comboVersion.pricing || {};
      const sizes = Object.keys(pricing);
      const comboPrice = sizes.length > 0 ? Math.min(...Object.values(pricing)) : 0;
      const addedPrice = addedItem.price || 0;
      const savings = comboPrice - addedPrice;
      
      if (savings > 0 && savings < 100) { // Only suggest if combo is reasonably priced
        const comboMessage = {
          id: generateUniqueId(),
          text: `💡 **Pro tip:** Upgrade to **${comboVersion.name}** for just ₱${savings} more and get a drink + side included!`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'menu-suggestions',
          suggestions: [{
            ...comboVersion,
            price: comboPrice,
            defaultSize: sizes[0] || 'regular'
          }]
        };
        setMessages(prev => [...prev, comboMessage]);
      }
    }
  };

  // Enhanced add to cart handler with dialog-based customization
  const handleAddToCartWithSize = (item, specifiedSize = null) => {
    const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
    const hasVariants = (item.variants || []).length > 0;
    
    // Get unique add-ons for this item (flexible matching)
    const relevantAddOns = (addOns || []).filter(addon => {
      const addonCat = (addon.category || '').toLowerCase();
      const itemCat = (item.category || '').toLowerCase();
      const itemSubCat = (item.subCategory || '').toLowerCase();
      
      return addonCat === 'all' || 
             addonCat === itemCat || 
             addonCat === itemSubCat ||
             (addonCat === 'beverages' && (itemCat.includes('beverage') || itemSubCat.includes('frappe') || itemSubCat.includes('milk') || itemSubCat.includes('tea') || itemSubCat.includes('lemonade')));
    });
    const uniqueAddOns = relevantAddOns.reduce((acc, addon) => {
      if (!acc.find(a => a.name === addon.name)) {
        acc.push(addon);
      }
      return acc;
    }, []);
    const hasAddOns = uniqueAddOns.length > 0;
    
    // If a size was specified and no variants AND no add-ons, add directly
    if (specifiedSize && !hasVariants && !hasAddOns) {
      const matchedSize = sizes.find(s => 
        s.toLowerCase() === specifiedSize.toLowerCase() ||
        s.toLowerCase().startsWith(specifiedSize.toLowerCase())
      );
      if (matchedSize) {
        onAddToCart(item, { size: matchedSize, skipCustomization: true });
        const confirmMessage = {
          id: generateUniqueId(),
          text: `Added **${item.name}** (${matchedSize}) to your cart! 🎉 Anything else?`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'cart-action'
        };
        setMessages(prev => [...prev, confirmMessage]);
        setPendingSizeSelection(null);
        setLastSuggestedItems([]);
        return;
      }
    }
    
    // Check if item needs any customization (sizes, variants, or add-ons)
    const needsCustomization = sizes.length > 1 || hasVariants || hasAddOns;
    
    if (needsCustomization) {
      setPendingSizeSelection(item);
      setLastSuggestedItems([item]);
      
      // Show dialog customization with buttons (pass size if specified)
      const customizationMessage = {
        id: generateUniqueId(),
        text: specifiedSize ? `Great choice! Let me get that **${item.name}** ready for you.` : `Let's customize your **${item.name}**!`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'dialog-customization',
        pendingItem: item,
        initialSize: specifiedSize // Pass specified size to dialog
      };
      setMessages(prev => [...prev, customizationMessage]);
    } else {
      // Single size, no variants, no add-ons - add directly
      const size = sizes[0] || 'regular';
      onAddToCart(item, { size, skipCustomization: true });
      
      const confirmMessage = {
        id: generateUniqueId(),
        text: `Added **${item.name}** to your cart! 🎉 Anything else?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'cart-action'
      };
      setMessages(prev => [...prev, confirmMessage]);
      setLastSuggestedItems([]);
      
      // Suggest upsell
      setTimeout(() => {
        suggestUpsell(item);
      }, 1000);
    }
  };

  // Handle dialog customization complete (size + variant + add-ons)
  const handleCustomizationComplete = (item, options) => {
    setPendingSizeSelection(null);
    setLastSuggestedItems([]);
    setConversationContext(null);
    
    onAddToCart(item, { 
      size: options.size, 
      variant: options.variant,
      addOns: options.addOns,
      skipCustomization: true 
    });
    
    // Build confirmation message
    let details = options.size;
    if (options.variant) details += `, ${options.variant}`;
    if (options.addOns && options.addOns.length > 0) {
      const addOnNames = options.addOns.map(a => a.name).join(', ');
      details += ` + ${addOnNames}`;
    }
    
    const confirmMessage = {
      id: generateUniqueId(),
      text: `Added **${item.name}** (${details}) to your cart! 🎉 Anything else?`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'cart-action'
    };
    setMessages(prev => [...prev, confirmMessage]);
    
    // Suggest upsell
    setTimeout(() => {
      suggestUpsell(item);
    }, 1000);
  };

  // Handle dialog customization cancel
  const handleCustomizationCancel = () => {
    setPendingSizeSelection(null);
    setLastSuggestedItems([]);
    setConversationContext(null);
    
    const cancelMessage = {
      id: generateUniqueId(),
      text: "No worries! Let me know if you'd like to order something else. 😊",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  // Detect confirmation intent (user saying yes to add something)
  const detectConfirmationIntent = (userInput) => {
    const lowerInput = userInput.toLowerCase().trim();
    const confirmationPhrases = [
      'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'alright',
      'add it', 'add that', 'add this', 'i\'ll take it', 'i\'ll have it',
      'sounds good', 'perfect', 'let\'s do it', 'go ahead', 'please add',
      'that one', 'the first one', 'i want it', 'i\'ll get it',
      'add to cart', 'add to my cart', 'add to order', 'add to my order'
    ];
    return confirmationPhrases.some(phrase => lowerInput.includes(phrase) || lowerInput === phrase);
  };

  // Detect direct add intent ("add fries", "I want wings", "give me burger")
  const detectDirectAddIntent = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    const addPhrases = [
      'add ', 'i want ', 'i\'ll have ', 'i\'ll take ', 'give me ', 
      'get me ', 'order ', 'can i have ', 'can i get ', 'i need ',
      'i\'d like ', 'let me have ', 'put ', 'include '
    ];
    return addPhrases.some(phrase => lowerInput.startsWith(phrase) || lowerInput.includes(phrase));
  };

  // Find menu item from user input
  const findMenuItemFromInput = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    
    // First try exact match
    for (const item of menuItems) {
      if (item.isAvailable !== false && lowerInput.includes(item.name.toLowerCase())) {
        return item;
      }
    }
    
    // Try partial match with key words
    for (const item of menuItems) {
      if (item.isAvailable === false) continue;
      const itemWords = item.name.toLowerCase().split(' ');
      for (const word of itemWords) {
        // Skip common words
        if (word.length <= 3 || ['with', 'and', 'the', 'ala', 'con'].includes(word)) continue;
        if (lowerInput.includes(word)) {
          return item;
        }
      }
    }
    
    return null;
  };

  // Detect if user is responding with a size
  const detectSizeResponse = (userInput) => {
    const lowerInput = userInput.toLowerCase().trim();
    const sizePatterns = {
      's': ['small', 's', 'sm', 'the small', 'small one', 'smaller'],
      'm': ['medium', 'm', 'med', 'the medium', 'medium one', 'regular'],
      'l': ['large', 'l', 'lg', 'the large', 'large one', 'bigger', 'big']
    };
    
    for (const [size, patterns] of Object.entries(sizePatterns)) {
      if (patterns.some(p => lowerInput === p || lowerInput.includes(p))) {
        return size;
      }
    }
    return null;
  };

  // Process user message with full AI functionality
  const processUserMessage = async (userInput) => {
    try {
      const lowerInput = userInput.toLowerCase().trim();
      
      // ========== 0. CHECK FOR SIZE RESPONSE (when awaiting size) ==========
      // If we're waiting for a size selection and user types a size
      if (conversationContext?.type === 'awaiting_size' && conversationContext?.item) {
        const sizeResponse = detectSizeResponse(lowerInput);
        if (sizeResponse) {
          const item = conversationContext.item;
          const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
          // Find matching size (case insensitive)
          const matchedSize = sizes.find(s => s.toLowerCase() === sizeResponse || s.toLowerCase().startsWith(sizeResponse));
          if (matchedSize) {
            onAddToCart(item, { size: matchedSize });
            setConversationContext(null);
            setPendingSizeSelection(null);
            setLastSuggestedItems([]);
            return {
              success: true,
              message: `Added **${item.name}** (${matchedSize.toUpperCase()}) to your cart! 🎉 Anything else?`,
              type: 'cart-action'
            };
          }
        }
      }
      
      // ========== CHECK FOR "ADD ANOTHER" WITH SIZE ==========
      // When user says "add another medium" or "another large please"
      const anotherMatch = lowerInput.match(/another\s+(small|medium|large|s|m|l|xl)/i);
      if (anotherMatch && lastSuggestedItems.length === 1) {
        const item = lastSuggestedItems[0];
        const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
        const sizeWord = anotherMatch[1].toLowerCase();
        const matchedSize = sizes.find(s => 
          s.toLowerCase() === sizeWord || 
          s.toLowerCase().startsWith(sizeWord)
        );
        if (matchedSize) {
          onAddToCart(item, { size: matchedSize, skipCustomization: true });
          // Keep lastSuggestedItems so they can add more
          return {
            success: true,
            message: `Added another **${item.name}** (${matchedSize}) to your cart! 🎉 Anything else?`,
            type: 'cart-action'
          };
        }
      }
      // ========== END ADD ANOTHER CHECK ==========
      
      // ========== CHECK FOR SIZE RESPONSE ==========
      // When AI asked about sizes and user types "medium", "large", etc.
      const sizeResponse = detectSizeResponse(lowerInput);
      if (sizeResponse && (pendingSizeSelection || lastSuggestedItems.length === 1)) {
        const item = pendingSizeSelection || lastSuggestedItems[0];
        const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
        const matchedSize = sizes.find(s => 
          s.toLowerCase() === sizeResponse || 
          s.toLowerCase().startsWith(sizeResponse)
        );
        if (matchedSize) {
          onAddToCart(item, { size: matchedSize, skipCustomization: true });
          setConversationContext(null);
          setPendingSizeSelection(null);
          setLastSuggestedItems([]);
          return {
            success: true,
            message: `Added **${item.name}** (${matchedSize}) to your cart! 🎉 Anything else?`,
            type: 'cart-action'
          };
        }
      }
      // ========== END SIZE RESPONSE CHECK ==========
      
      // ========== CHECK FOR VARIANT/SIZE COMBO RESPONSE ==========
      // When AI asked about variants and user says "chocolate medium" or just "vanilla"
      if (lastSuggestedItems.length === 1 && pendingSizeSelection) {
        const item = lastSuggestedItems[0];
        const hasVariants = (item.variants || []).length > 0;
        
        if (hasVariants) {
          const matchedVariant = item.variants.find(v => 
            lowerInput.includes(v.name.toLowerCase())
          );
          
          if (matchedVariant) {
            const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
            const sizeResponse = detectSizeResponse(lowerInput);
            const matchedSize = sizeResponse ? sizes.find(s => 
              s.toLowerCase() === sizeResponse || 
              s.toLowerCase().startsWith(sizeResponse)
            ) : null;
            
            if (matchedSize || sizes.length === 1) {
              const finalSize = matchedSize || sizes[0];
              
              onAddToCart(item, { 
                size: finalSize, 
                variant: matchedVariant.name,
                skipCustomization: true 
              });
              
              setLastSuggestedItems([]);
              setPendingSizeSelection(null);
              setConversationContext(null);
              
              return {
                success: true,
                message: `Added **${item.name}** (${matchedVariant.name}, ${finalSize}) to your cart! 🎉 Anything else?`,
                type: 'cart-action'
              };
            } else {
              // Have variant but need size
              const sizeOptions = sizes.map(s => `${s} (₱${item.pricing[s]})`).join(' or ');
              return {
                success: false,
                message: `Great choice - ${matchedVariant.name}! What size? ${sizeOptions}`,
                type: 'text'
              };
            }
          }
        }
      }
      // ========== END VARIANT CHECK ==========
      
      // ========== 1. CHECK FOR CART MODIFICATION FIRST ==========
      const cartIntent = detectCartModificationIntent(userInput);
      if (cartIntent && currentOrder.length > 0) {
        const result = handleCartModification(cartIntent, userInput);
        if (result) {
          return result;
        }
      }
      
      if (cartIntent && currentOrder.length === 0) {
        return {
          success: false,
          message: "Your cart is empty! Let me help you find something delicious to add. 😋",
          type: 'text'
        };
      }

      // ========== 2. CHECK FOR DIRECT ADD INTENT ==========
      // User says "add fries" or "I want wings" - find and add the item directly
      if (detectDirectAddIntent(userInput)) {
        const itemToAdd = findMenuItemFromInput(userInput);
        if (itemToAdd) {
          // Dialog-based: ask about size in conversation
          handleAddToCartWithSize(itemToAdd);
          return {
            success: true,
            handled: true // Signal that we handled it
          };
        }
      }

      // ========== 3. CHECK FOR CONFIRMATION INTENT ==========
      // User says "yes", "add it", etc. - check if we have context
      if (detectConfirmationIntent(userInput)) {
        // Check if user mentioned a specific item in their confirmation
        const mentionedItem = findMenuItemFromInput(userInput);
        
        if (mentionedItem) {
          // Dialog-based: ask about size in conversation
          handleAddToCartWithSize(mentionedItem);
          return {
            success: true,
            handled: true
          };
        }
        
        // No specific item mentioned - check last suggested items
        if (lastSuggestedItems.length === 1) {
          // Only one item was suggested - add it!
          const item = lastSuggestedItems[0];
          handleAddToCartWithSize(item);
          return {
            success: true,
            handled: true
          };
        } else if (lastSuggestedItems.length > 1) {
          // Multiple items were suggested - need clarification
          const itemNames = lastSuggestedItems.map(i => `**${i.name}**`).join(' or ');
          return {
            success: false,
            message: `Which one would you like? ${itemNames}? Just say the name!`,
            type: 'text'
          };
        }
      }
      
      // ========== 4. CHECK FOR UNAVAILABLE ITEM QUERY ==========
      const isUnavailableQuery = detectUnavailableItemIntent(userInput);
      if (isUnavailableQuery) {
        const itemName = extractItemNameFromInput(userInput);
        const enhancedInput = `The customer is asking about "${itemName}" which might not be available. Please suggest similar alternatives from our menu with specific items and prices.`;
        return await getAIResponse(enhancedInput, abortControllerRef.current?.signal);
      }
      
      // ========== 5. DEFAULT: GET AI RESPONSE ==========
      return await getAIResponse(userInput, abortControllerRef.current?.signal);
    } catch (error) {
      console.error('Error processing user message:', error);
      return "Sorry, I'm having trouble right now. Please try again in a moment.";
    }
  };

  // Check if user input matches a size for pending selection
  const matchSizeFromInput = (input, availableSizes) => {
    const lowerInput = input.toLowerCase().trim();
    const sizeAliases = {
      'small': ['small', 's', 'sm'],
      'medium': ['medium', 'm', 'med'],
      'large': ['large', 'l', 'lg'],
      'base': ['base', 'regular', 'reg'],
      'solo': ['solo'],
      'barkada': ['barkada', 'group'],
      'extra large': ['extra large', 'xl', 'extra-large']
    };
    
    for (const size of availableSizes) {
      const sizeLower = size.toLowerCase();
      // Direct match
      if (lowerInput.includes(sizeLower)) return size;
      // Check aliases
      const aliases = sizeAliases[sizeLower] || [];
      if (aliases.some(alias => lowerInput.includes(alias))) return size;
    }
    return null;
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMessage = {
      id: generateUniqueId(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');

    // ========== CHECK PENDING SIZE SELECTION FIRST ==========
    // If user has a pending item waiting for size selection, check if they typed a size
    if (pendingSizeSelection) {
      const availableSizes = Object.keys(pendingSizeSelection.pricing || {});
      const matchedSize = matchSizeFromInput(currentInput, availableSizes);
      
      if (matchedSize) {
        // User typed a valid size - use handleAddToCartWithSize to show dialog for variants/add-ons
        handleAddToCartWithSize(pendingSizeSelection, matchedSize);
        return;
      } else {
        // User typed something else but we have pending selection
        // Show a helpful message reminding them
        const sizeOptions = availableSizes.map(s => `**${s}** (₱${pendingSizeSelection.pricing[s]})`).join(', ');
        const reminderMessage = {
          id: generateUniqueId(),
          text: `I still need to know which size for **${pendingSizeSelection.name}**! Options: ${sizeOptions}. Or tap one of the size buttons above.`,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reminderMessage]);
        return;
      }
    }
    // ========== END PENDING SIZE CHECK ==========

    setIsThinking(true);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const aiResponse = await processUserMessage(currentInput);
      
      if (aiResponse === null) return; // Request was cancelled

      // Handle cart modification responses (they return an object with message and type)
      if (typeof aiResponse === 'object') {
        // If handled flag is set, the action was taken via handleAddToCartWithSize
        // which already showed appropriate UI feedback
        if (aiResponse.handled) {
          setIsThinking(false);
          return;
        }
        
        if (aiResponse.message) {
          // Handle size selection prompt specially
          if (aiResponse.type === 'size-selection-prompt' && aiResponse.item) {
            const sizeMessage = {
              id: generateUniqueId(),
              text: aiResponse.message,
              sender: 'bot',
              timestamp: new Date(),
              type: 'size-selection',
              pendingItem: aiResponse.item
            };
            setMessages(prev => [...prev, sizeMessage]);
            setIsThinking(false);
            return;
          }
          
          const botMessage = {
            id: generateUniqueId(),
            text: aiResponse.message,
            sender: 'bot',
            timestamp: new Date(),
            type: aiResponse.type || 'text'
          };
          setMessages(prev => [...prev, botMessage]);
          setIsThinking(false);
          return;
        }
      }

      // Check if this was an unavailable item query
      const isUnavailableQuery = detectUnavailableItemIntent(currentInput);
      const itemName = isUnavailableQuery ? extractItemNameFromInput(currentInput) : null;
      
      let suggestionContext = {};
      if (isUnavailableQuery && itemName) {
        // Try to get system alternatives
        const unavailableItem = menuItems.find(item => 
          item.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(item.name.toLowerCase())
        );
        
        if (unavailableItem) {
          try {
            const response = await fetch(`/api/menu/${unavailableItem._id}/alternatives`);
            if (response.ok) {
              const data = await response.json();
              suggestionContext.systemAlternatives = data.alternatives || [];
            }
          } catch (error) {
            console.log('Could not fetch system alternatives:', error);
          }
        }
      }

      // Extract suggestions
      const suggestions = extractMenuSuggestions(aiResponse, suggestionContext);
      
      // ========== TRACK SUGGESTED ITEMS FOR CONTEXT ==========
      if (suggestions.length > 0) {
        setLastSuggestedItems(suggestions);
        setConversationContext({ type: 'suggested_items', items: suggestions });
      }
      // ========== END TRACKING ==========
      
      // Create bot message
      const botMessage = {
        id: generateUniqueId(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: suggestions.length > 0 ? 'menu-suggestions' : 'text',
        suggestions: suggestions
      };

      setMessages(prev => [...prev, botMessage]);

      // Add follow-up message for suggestions (only if not asking for size)
      if (suggestions.length > 0) {
        // Check if AI is asking about size (don't show "say yes" in that case)
        const isAskingForSize = aiResponse.toLowerCase().includes('medium') && aiResponse.toLowerCase().includes('large') ||
                                aiResponse.toLowerCase().includes('what size') ||
                                aiResponse.toLowerCase().includes('which size');
        
        if (isAskingForSize && suggestions.length === 1) {
          // AI is asking for size - set pending selection so we can handle the size response
          setPendingSizeSelection(suggestions[0]);
        } else if (!isAskingForSize) {
          setTimeout(() => {
            let followUpText = suggestions.length === 1 
              ? `Say "yes" or tap above to add **${suggestions[0].name}** to your cart!`
              : "Tap any item above to add it, or tell me which one you'd like!";
            
            if (isUnavailableQuery) {
              followUpText = "These alternatives should satisfy your craving! Tap any item to add it, or just say the name!";
            }
            
            const followUpMessage = {
              id: generateUniqueId(),
              text: followUpText,
              sender: 'bot',
              timestamp: new Date(),
              type: 'follow-up'
            };
            setMessages(prev => [...prev, followUpMessage]);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        id: generateUniqueId(),
        text: "I'm having trouble right now. Please try again in a moment!",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Parse bottom position from bottomClass prop (e.g., 'bottom-28' -> 112px, 'bottom-6' -> 24px)
  const getBottomPosition = () => {
    if (!bottomClass) return 24; // default bottom-6 = 1.5rem = 24px
    const match = bottomClass.match(/bottom-(\d+)/);
    if (match) {
      return parseInt(match[1]) * 4; // Tailwind uses 4px per unit
    }
    return 24;
  };

  // Layout-specific rendering based on breakpoint
  if (isMobile) {
    return (
      <>
        {/* Floating Action Button */}
        {!isOpen && (
          <motion.div 
            className="fixed right-4 z-40"
            initial={{ scale: 0, bottom: 24 }}
            animate={{ 
              scale: 1, 
              bottom: getBottomPosition()
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 25 
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
              style={{ backgroundColor: colors.accent }}
            >
              <AIAvatar size="default" />
            </button>
          </motion.div>
        )}

        {/* Mobile Bottom Sheet */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <AIAvatar size="default" isThinking={isThinking} />
                  <div>
                    <h3 className="font-semibold text-gray-800">Ring & Wing Assistant</h3>
                    <p className="text-sm text-gray-500">Your food ordering buddy</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    onAddToCart={handleAddToCartWithSize}
                    onManualTap={handleManualItemTap}
                    onSelectSize={handleSizeSelected}
                    onCancelSize={handleSizeCancel}
                    onCustomizationComplete={handleCustomizationComplete}
                    onCustomizationCancel={handleCustomizationCancel}
                    addOns={addOns}
                    menuItems={menuItems}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Cart Summary & Submit Button */}
              {currentOrder.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-orange-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-800">
                        {currentOrder.length} {currentOrder.length === 1 ? 'item' : 'items'} in cart
                      </span>
                    </div>
                    <span className="text-sm font-bold text-orange-600">₱{cartTotal.toFixed(2)}</span>
                  </div>
                  {onSubmitOrder && (
                    <button
                      onClick={onSubmitOrder}
                      disabled={!isAuthenticated}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md ${
                        isAuthenticated
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white active:scale-[0.98]'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isAuthenticated ? '🛒 Submit Order' : '🔒 Login to Order'}
                    </button>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about our menu..."
                      className="w-full px-4 py-3 pr-12 bg-gray-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm max-h-20"
                      rows={1}
                      style={{ minHeight: '48px' }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isThinking}
                    className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (isTablet) {
    return (
      <>
        {/* Side Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: isOpen ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <AIAvatar size="default" isThinking={isThinking} />
              <div>
                <h3 className="font-semibold text-gray-800">Ring & Wing Assistant</h3>
                <p className="text-sm text-gray-500">Your food ordering buddy</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onAddToCart={handleAddToCartWithSize}
                onManualTap={handleManualItemTap}
                onSelectSize={handleSizeSelected}
                onCancelSize={handleSizeCancel}
                onCustomizationComplete={handleCustomizationComplete}
                onCustomizationCancel={handleCustomizationCancel}
                addOns={addOns}
                menuItems={menuItems}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Cart Summary & Submit Button */}
          {currentOrder.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-orange-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="text-sm font-medium text-orange-800">
                    {currentOrder.length} {currentOrder.length === 1 ? 'item' : 'items'} in cart
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-600">₱{cartTotal.toFixed(2)}</span>
              </div>
              {onSubmitOrder && (
                <button
                  onClick={onSubmitOrder}
                  disabled={!isAuthenticated}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md ${
                    isAuthenticated
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white active:scale-[0.98]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAuthenticated ? '🛒 Submit Order' : '🔒 Login to Order'}
                </button>
              )}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about our menu..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm max-h-20"
                  rows={1}
                  style={{ minHeight: '48px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isThinking}
                className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{ backgroundColor: colors.accent }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Toggle Button for Tablet */}
        {!isOpen && (
          <motion.button
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-16 rounded-l-xl shadow-lg flex items-center justify-center z-30"
            style={{ backgroundColor: colors.accent }}
          >
            <AIAvatar size="small" />
          </motion.button>
        )}
      </>
    );
  }

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 right-6 w-96 h-[32rem] bg-white rounded-3xl shadow-2xl z-40 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <AIAvatar size="default" isThinking={isThinking} />
                <div>
                  <h3 className="font-semibold text-gray-800">Ring & Wing Assistant</h3>
                  <p className="text-sm text-gray-500">Your food ordering buddy</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  onAddToCart={handleAddToCartWithSize}
                  onManualTap={handleManualItemTap}
                  onSelectSize={handleSizeSelected}
                  onCancelSize={handleSizeCancel}
                  onCustomizationComplete={handleCustomizationComplete}
                  onCustomizationCancel={handleCustomizationCancel}
                  addOns={addOns}
                  menuItems={menuItems}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Cart Summary & Submit Button */}
            {currentOrder.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-800">
                      {currentOrder.length} {currentOrder.length === 1 ? 'item' : 'items'} in cart
                    </span>
                  </div>
                  <span className="text-sm font-bold text-orange-600">₱{cartTotal.toFixed(2)}</span>
                </div>
                {onSubmitOrder && (
                  <button
                    onClick={onSubmitOrder}
                    disabled={!isAuthenticated}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-md ${
                      isAuthenticated
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-[0.98]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isAuthenticated ? '🛒 Submit Order' : '🔒 Login to Order'}
                  </button>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about our menu..."
                    className="w-full px-4 py-3 pr-12 bg-gray-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm max-h-20"
                    rows={1}
                    style={{ minHeight: '48px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isThinking}
                  className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
                  style={{ backgroundColor: colors.accent }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Floating Action Button for Desktop */}
        {!isOpen && (
          <motion.div 
            className="fixed bottom-6 right-6 z-40"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <button
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-200"
              style={{ backgroundColor: colors.accent }}
            >
              <AIAvatar size="large" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return null;
};

AssistantPanel.propTypes = {
  menuItems: PropTypes.array,
  currentOrder: PropTypes.array,
  onAddToCart: PropTypes.func,
  onRemoveFromCart: PropTypes.func,
  onUpdateQuantity: PropTypes.func,
  onUpdateSize: PropTypes.func,
  onClearCart: PropTypes.func,
  onOrderSuggestion: PropTypes.func,
  onOpenChange: PropTypes.func,
  onSubmitOrder: PropTypes.func,
  isAuthenticated: PropTypes.bool,
  cartTotal: PropTypes.number,
  bottomClass: PropTypes.string
};

export default AssistantPanel;