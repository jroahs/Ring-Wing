import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { API_URL } from '../../App';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b'
};

// Text formatting helper - converts **text** to bold and highlights prices
const FormattedText = ({ text, menuItems = [] }) => {
  if (!text) return null;
  
  // Split by **bold** markers and ₱prices
  const parts = text.split(/(\*\*[^*]+\*\*|₱[\d,]+(?:\.\d{2})?)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Handle **bold** syntax
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={index} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </span>
          );
        }
        
        // Handle prices
        if (part.match(/^₱[\d,]+(?:\.\d{2})?$/)) {
          return (
            <span key={index} className="font-bold text-orange-600">
              {part}
            </span>
          );
        }
        
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

FormattedText.propTypes = {
  text: PropTypes.string,
  menuItems: PropTypes.array
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

// Size Selection Component - Inline buttons for selecting item size (legacy, kept for simple cases)
const SizeSelectionMessage = ({ item, onSelectSize, onCancel }) => {
  const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
  
  return (
    <div className="flex gap-2">
      <AIAvatar size="small" />
      <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
            <img 
              src={item.image || '/placeholders/meal.png'} 
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = '/placeholders/meal.png'; }}
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
            <p className="text-xs text-gray-500">Select size:</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => onSelectSize(item, size)}
              className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-sm"
            >
              <span className="font-medium text-gray-700 capitalize">{size}</span>
              <span className="font-bold text-orange-600">₱{item.pricing[size]}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={onCancel}
          className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

SizeSelectionMessage.propTypes = {
  item: PropTypes.object.isRequired,
  onSelectSize: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

// AI Avatar Component
const AIAvatar = ({ isThinking = false, size = 'default' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-10 h-10'
  };
  
  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4', 
    large: 'w-5 h-5'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
      isThinking ? 'animate-pulse' : ''
    }`} style={{ backgroundColor: colors.accent }}>
      <svg 
        className={`${iconSizes[size]} text-white ${isThinking ? 'animate-spin' : ''}`} 
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
  isThinking: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'default', 'large'])
};

// Chat Message Component
const ChatMessage = ({ message, onAddToCart, onManualTap, onSelectSize, onCancelSize, onCustomizationComplete, onCustomizationCancel, addOns = [], menuItems = [] }) => {
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
  
  // Handle size selection message type
  if (message.type === 'size-selection' && message.pendingItem) {
    return (
      <SizeSelectionMessage
        item={message.pendingItem}
        onSelectSize={onSelectSize}
        onCancel={onCancelSize}
      />
    );
  }

  if (message.type === 'menu-suggestions') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <AIAvatar size="small" />
          <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-gray-100 text-gray-800">
            <p className="text-sm leading-relaxed">
              <FormattedText text={message.text} menuItems={menuItems} />
            </p>
          </div>
        </div>
        
        {/* Menu suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="ml-8 space-y-2">
            {message.suggestions.map((suggestion, index) => {
              const menuItem = menuItems.find(item => 
                item._id === suggestion._id || 
                item.name.toLowerCase() === suggestion.name.toLowerCase()
              );
              
              if (!menuItem) return null;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl p-3 transition-all duration-200 cursor-pointer"
                  onClick={() => onManualTap ? onManualTap(menuItem) : onAddToCart(menuItem)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      <img 
                        src={menuItem.image || (menuItem.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')} 
                        alt={suggestion.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = menuItem.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-sm truncate">
                        {suggestion.name}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-orange-600 text-sm">₱{suggestion.price}</span>
                        <span className="text-xs text-orange-600 font-medium">+ Add</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Handle cart modification confirmation
  if (message.type === 'cart-action') {
    return (
      <div className="flex gap-2">
        <AIAvatar size="small" />
        <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-orange-50 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium text-orange-800">Done!</span>
          </div>
          <p className="text-sm text-orange-700 leading-relaxed">
            <FormattedText text={message.text} menuItems={menuItems} />
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex gap-2">
      {message.sender === 'bot' && <AIAvatar size="small" isThinking={message.isThinking} />}
      <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${
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
    text: PropTypes.string,
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

// Main Embedded Assistant Component
const EmbeddedAssistant = ({ 
  menuItems = [], 
  currentOrder = [], 
  addOns = [],
  onAddToCart = () => {},
  onRequestCustomization = null,
  onRemoveFromCart = () => {},
  onUpdateQuantity = () => {},
  onUpdateSize = () => {},
  onClearCart = () => {},
  onSubmitOrder = null,
  isAuthenticated = false,
  cartTotal = 0
}) => {
  const [categories, setCategories] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm here to help you order. Ask me anything about our menu!",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingSizeSelection, setPendingSizeSelection] = useState(null);
  const [lastSuggestedItems, setLastSuggestedItems] = useState([]); // Track for context
  const [conversationContext, setConversationContext] = useState(null);
  const hasAddedInitialSuggestionsRef = useRef(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch categories
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
        setCategories([
          { category: 'Meals', subCategories: [] },
          { category: 'Beverages', subCategories: [] }
        ]);
      }
    };
    fetchCategories();
  }, []);

  // Get initial suggestions
  const getInitialSuggestions = () => {
    if (!menuItems || menuItems.length === 0) return [];
    
    const availableItems = menuItems.filter(item => 
      item.isAvailable !== false && 
      item.name && 
      item.pricing && 
      Object.keys(item.pricing).length > 0
    );
    
    if (availableItems.length === 0) return [];
    
    // Get 2 popular items
    const suggestions = availableItems.slice(0, 2).map(item => {
      const pricing = item.pricing || {};
      const basePrice = Math.min(...Object.values(pricing));
      return {
        ...item,
        price: basePrice,
        defaultSize: Object.keys(pricing).includes('base') ? 'base' : Object.keys(pricing)[0] || 'regular'
      };
    });
    
    return suggestions;
  };

  // Add initial suggestions
  useEffect(() => {
    if (menuItems.length > 0 && !hasAddedInitialSuggestionsRef.current) {
      const initialSuggestions = getInitialSuggestions();
      if (initialSuggestions.length > 0) {
        setMessages(prev => [
          ...prev,
          {
            id: generateUniqueId(),
            text: "Here are some popular items to start!",
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

  // Get AI response
  const getAIResponse = async (userInput, signal = null) => {
    const menuContext = menuItems.map(item => {
      const prices = item.pricing ? 
        Object.entries(item.pricing)
          .map(([size, price]) => `${size}: ₱${price}`)
          .join(', ')
        : 'Price not available';
      
      return `- ${item.name}: Prices: ${prices}. Category: ${item.category || 'Uncategorized'}. Available: ${item.isAvailable !== false}`;
    }).join('\n');

    const currentOrderContext = currentOrder.length > 0 
      ? `Current cart (${currentOrder.length} items, total ₱${cartTotal.toFixed(2)}): ${currentOrder.map(item => `${item.name} (${item.selectedSize}) x${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)}`).join(', ')}`
      : 'No items in cart yet';

    const systemMessage = {
      role: "system",
      content: `You are Ringo, Ring & Wings restaurant's friendly AI assistant. You have a warm, casual personality and you're here to help customers with anything!

CURRENT MENU:
${menuContext}

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
1. Keep responses conversational and short (2-3 sentences)
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
- Example: User: "iced spanish cafe pls" → You: "Perfect! **Iced Spanish Cafe Latte** - do you want Medium (₱90) or Large (₱110)?" → User: "medium" → You: "Great! Adding Medium Iced Spanish Cafe Latte (₱90) to your cart!"

EXAMPLE NATURAL CONVERSATIONS:
- "hello" → "Hey there! 👋 Welcome to Ring & Wings! Craving something crispy or maybe a cold drink?"
- "I want iced spanish cafe" → "Awesome choice! **Iced Spanish Cafe Latte** comes in Medium (₱90) or Large (₱110). Which size?"
- "medium" → "Perfect! Adding your **Iced Spanish Cafe Latte** (Medium - ₱90)! Anything else?"`
    };

    const payload = {
      model: "gemini-2.5-flash",
      messages: [systemMessage, { role: "user", content: userInput }],
      temperature: 0.7,
      max_tokens: 300
    };

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      
      if (data.error || !data.choices?.[0]?.message) {
        throw new Error('Invalid response');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      if (error.name === 'AbortError') return null;
      console.error("AI Error:", error);
      return "Sorry, I'm having trouble. Please try again.";
    }
  };

  // Cart modification detection
  const detectCartModification = (userInput) => {
    const lowerInput = userInput.toLowerCase();
    
    // Remove/delete actions
    const removeKeywords = ['remove', 'delete', 'take out', 'cancel', 'get rid of', 'don\'t want'];
    const hasRemoveIntent = removeKeywords.some(kw => lowerInput.includes(kw));
    
    // Clear cart actions
    const clearKeywords = ['clear cart', 'empty cart', 'start over', 'remove all', 'clear everything'];
    const hasClearIntent = clearKeywords.some(kw => lowerInput.includes(kw));
    
    if (hasClearIntent && currentOrder.length > 0) {
      return { action: 'clear', success: true };
    }
    
    if (hasRemoveIntent) {
      // Find which item to remove
      for (const cartItem of currentOrder) {
        if (lowerInput.includes(cartItem.name.toLowerCase())) {
          return { 
            action: 'remove', 
            item: cartItem,
            success: true 
          };
        }
      }
    }
    
    return null;
  };

  // Execute cart modification
  const executeCartModification = (modification) => {
    if (modification.action === 'clear') {
      onClearCart();
      // Reset conversation state
      setLastSuggestedItems([]);
      setConversationContext(null);
      setPendingSizeSelection(null);
      return { 
        text: "Done! I've cleared your cart. Ready to start a new order?",
        type: 'cart-action'
      };
    }
    
    if (modification.action === 'remove' && modification.item) {
      onRemoveFromCart(modification.item._id, modification.item.selectedSize);
      return {
        text: `Removed **${modification.item.name}** from your cart!`,
        type: 'cart-action'
      };
    }
    
    return null;
  };

  // Extract menu suggestions from response
  const extractMenuSuggestions = (aiResponse) => {
    const suggestions = [];
    
    menuItems.forEach(item => {
      if (aiResponse.toLowerCase().includes(item.name.toLowerCase()) && item.isAvailable !== false) {
        const pricing = item.pricing || {};
        suggestions.push({
          ...item,
          price: Math.min(...Object.values(pricing)),
          defaultSize: Object.keys(pricing).includes('base') ? 'base' : Object.keys(pricing)[0] || 'regular'
        });
      }
    });

    return suggestions.slice(0, 3);
  };

  // ========== INTENT DETECTION FUNCTIONS ==========
  
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

  // Detect direct add intent ("add fries", "I want wings")
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
        if (word.length <= 3 || ['with', 'and', 'the', 'ala', 'con'].includes(word)) continue;
        if (lowerInput.includes(word)) {
          return item;
        }
      }
    }
    
    return null;
  };

  // ========== END INTENT DETECTION ==========

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

  // Handle adding item via DIALOG - uses button-based customization
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
    }
  };

  // Handle size selection callback
  const handleSizeSelected = (item, size) => {
    setPendingSizeSelection(null);
    setLastSuggestedItems([]); // Clear so "yes" doesn't re-add
    setConversationContext(null);
    onAddToCart(item, { size, skipCustomization: true });
    
    const confirmMessage = {
      id: generateUniqueId(),
      text: `Added **${item.name}** (${size}) to your cart! 🎉`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'cart-action'
    };
    setMessages(prev => [...prev, confirmMessage]);
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
      if (lowerInput.includes(sizeLower)) return size;
      const aliases = sizeAliases[sizeLower] || [];
      if (aliases.some(alias => lowerInput.includes(alias))) return size;
    }
    return null;
  };

  // Handle send message
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
    if (pendingSizeSelection) {
      const availableSizes = Object.keys(pendingSizeSelection.pricing || {}).filter(k => k !== '_id');
      const matchedSize = matchSizeFromInput(currentInput, availableSizes);
      
      if (matchedSize) {
        // Use handleAddToCartWithSize to show dialog for variants/add-ons
        handleAddToCartWithSize(pendingSizeSelection, matchedSize);
        return;
      } else {
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
    
    // ========== CHECK FOR "ADD ANOTHER" WITH SIZE ==========
    // When user says "add another medium" or "another large please"
    const anotherMatch = currentInput.toLowerCase().match(/another\s+(small|medium|large|s|m|l|xl)/i);
    if (anotherMatch && lastSuggestedItems.length === 1) {
      const item = lastSuggestedItems[0];
      const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
      const matchedSize = matchSizeFromInput(anotherMatch[1], sizes);
      if (matchedSize) {
        onAddToCart(item, { size: matchedSize, skipCustomization: true });
        const price = item.pricing[matchedSize];
        const confirmMessage = {
          id: generateUniqueId(),
          text: `Added another **${item.name}** (${matchedSize}) to your cart! 🎉 Anything else?`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'cart-action'
        };
        setMessages(prev => [...prev, confirmMessage]);
        // Keep lastSuggestedItems so they can add more
        return;
      }
    }
    // ========== END ADD ANOTHER CHECK ==========
    
    // ========== CHECK FOR SIZE RESPONSE WITH LAST SUGGESTED ITEM ==========
    // When AI asked about sizes and user types "medium" or "large"
    if (lastSuggestedItems.length === 1) {
      const item = lastSuggestedItems[0];
      const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
      if (sizes.length > 1) {
        const matchedSize = matchSizeFromInput(currentInput, sizes);
        if (matchedSize) {
          onAddToCart(item, { size: matchedSize, skipCustomization: true });
          setLastSuggestedItems([]);
          setPendingSizeSelection(null);
          const price = item.pricing[matchedSize];
          const confirmMessage = {
            id: generateUniqueId(),
            text: `Added **${item.name}** (${matchedSize}) to your cart! 🎉 Anything else?`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'cart-action'
          };
          setMessages(prev => [...prev, confirmMessage]);
          return;
        }
      }
    }
    // ========== END SIZE RESPONSE CHECK ==========
    
    // ========== CHECK FOR VARIANT/SIZE COMBO RESPONSE ==========
    // When AI asked about variants and user says "chocolate medium" or just "vanilla"
    if (lastSuggestedItems.length === 1 && pendingSizeSelection) {
      const item = lastSuggestedItems[0];
      const hasVariants = (item.variants || []).length > 0;
      
      if (hasVariants) {
        const lowerInput = currentInput.toLowerCase();
        const matchedVariant = item.variants.find(v => 
          lowerInput.includes(v.name.toLowerCase())
        );
        
        if (matchedVariant) {
          const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
          const matchedSize = matchSizeFromInput(currentInput, sizes);
          
          if (matchedSize || sizes.length === 1) {
            const finalSize = matchedSize || sizes[0];
            const basePrice = item.pricing[finalSize] || 0;
            const variantPrice = matchedVariant.priceAdjustment || 0;
            
            onAddToCart(item, { 
              size: finalSize, 
              variant: matchedVariant.name,
              skipCustomization: true 
            });
            
            setLastSuggestedItems([]);
            setPendingSizeSelection(null);
            
            const confirmMessage = {
              id: generateUniqueId(),
              text: `Added **${item.name}** (${matchedVariant.name}, ${finalSize}) to your cart! 🎉 Anything else?`,
              sender: 'bot',
              timestamp: new Date(),
              type: 'cart-action'
            };
            setMessages(prev => [...prev, confirmMessage]);
            return;
          } else {
            // Have variant but need size
            const sizeOptions = sizes.map(s => `${s} (₱${item.pricing[s]})`).join(' or ');
            const sizeMessage = {
              id: generateUniqueId(),
              text: `Great choice - ${matchedVariant.name}! What size? ${sizeOptions}`,
              sender: 'bot',
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, sizeMessage]);
            return;
          }
        }
      }
    }
    // ========== END VARIANT CHECK ==========
    
    // ========== CHECK FOR DIRECT ADD INTENT ==========
    if (detectDirectAddIntent(currentInput)) {
      const itemToAdd = findMenuItemFromInput(currentInput);
      if (itemToAdd) {
        // Dialog-based: ask about size in conversation
        handleAddToCartWithSize(itemToAdd);
        return;
      }
    }

    // ========== CHECK FOR CONFIRMATION INTENT ==========
    if (detectConfirmationIntent(currentInput)) {
      const mentionedItem = findMenuItemFromInput(currentInput);
      
      if (mentionedItem) {
        // Dialog-based: ask about size in conversation
        handleAddToCartWithSize(mentionedItem);
        return;
      }
      
      // Check last suggested items - if only one, add it
      if (lastSuggestedItems.length === 1) {
        const item = lastSuggestedItems[0];
        handleAddToCartWithSize(item);
        return;
      } else if (lastSuggestedItems.length > 1) {
        const itemNames = lastSuggestedItems.map(i => `**${i.name}**`).join(' or ');
        const clarifyMessage = {
          id: generateUniqueId(),
          text: `Which one would you like? ${itemNames}? Just say the name!`,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, clarifyMessage]);
        return;
      }
    }
    // ========== END CONFIRMATION CHECK ==========
    
    // Check for cart modification intent
    const cartModification = detectCartModification(currentInput);
    if (cartModification && cartModification.success) {
      const result = executeCartModification(cartModification);
      if (result) {
        setMessages(prev => [...prev, {
          id: generateUniqueId(),
          text: result.text,
          sender: 'bot',
          timestamp: new Date(),
          type: result.type || 'text'
        }]);
        return;
      }
    }
    
    setIsThinking(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const aiResponse = await getAIResponse(currentInput, abortControllerRef.current.signal);
      
      if (aiResponse === null) return;

      const suggestions = extractMenuSuggestions(aiResponse);
      
      // Track suggested items for context
      if (suggestions.length > 0) {
        setLastSuggestedItems(suggestions);
      }
      
      const botMessage = {
        id: generateUniqueId(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: suggestions.length > 0 ? 'menu-suggestions' : 'text',
        suggestions
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Add helpful follow-up for suggestions (only if not asking for size)
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
            const followUpText = suggestions.length === 1 
              ? `Say "yes" or tap to add **${suggestions[0].name}**!`
              : "Tap any item or tell me which one you'd like!";
            setMessages(prev => [...prev, {
              id: generateUniqueId(),
              text: followUpText,
              sender: 'bot',
              timestamp: new Date(),
              type: 'follow-up'
            }]);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: "Sorry, something went wrong. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      }]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
        <AIAvatar size="default" isThinking={isThinking} />
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">AI Assistant</h3>
          <p className="text-xs text-gray-500">Ask me about our menu!</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
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
        {isThinking && (
          <div className="flex gap-2">
            <AIAvatar size="small" isThinking />
            <div className="px-3 py-2 rounded-2xl bg-gray-100">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Cart Context & Submit Button */}
      {currentOrder.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 bg-orange-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isAuthenticated
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAuthenticated ? 'Submit Order' : 'Login to Order'}
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about our menu..."
              className="w-full px-3 py-2 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '80px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isThinking}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
            style={{ backgroundColor: colors.accent }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

EmbeddedAssistant.propTypes = {
  menuItems: PropTypes.array,
  currentOrder: PropTypes.array,
  onAddToCart: PropTypes.func,
  onRemoveFromCart: PropTypes.func,
  onUpdateQuantity: PropTypes.func,
  onUpdateSize: PropTypes.func,
  onClearCart: PropTypes.func,
  onSubmitOrder: PropTypes.func,
  isAuthenticated: PropTypes.bool,
  cartTotal: PropTypes.number
};

export default EmbeddedAssistant;