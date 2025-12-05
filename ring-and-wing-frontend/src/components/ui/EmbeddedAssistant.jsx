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

// Size Selection Component - Inline buttons for selecting item size
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
const ChatMessage = ({ message, onAddToCart, onSelectSize, onCancelSize, menuItems = [] }) => {
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
                  onClick={() => onAddToCart(menuItem)}
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
  onSelectSize: PropTypes.func,
  onCancelSize: PropTypes.func,
  menuItems: PropTypes.array
};

// Main Embedded Assistant Component
const EmbeddedAssistant = ({ 
  menuItems = [], 
  currentOrder = [], 
  onAddToCart = () => {},
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
      content: `You are a helpful ordering assistant for Ring & Wings restaurant's self-checkout system. You help customers place orders using natural language.

CURRENT MENU:
${menuContext}

CUSTOMER'S CART:
${currentOrderContext}

FORMATTING RULES (IMPORTANT):
- Use **double asterisks** around menu item names to make them bold (e.g., **Buffalo Wings**)
- Always include the price after the item name in this format: **Item Name** (₱price)
- Use bold for important actions or highlights

RESPONSE GUIDELINES:
1. Be friendly, warm, and helpful - you're the customer's food ordering buddy!
2. Keep responses short (2-3 sentences max for readability)
3. When suggesting items, ALWAYS format as: **Item Name** (₱price)
4. If items are unavailable, suggest alternatives with empathy
5. Be proactive in suggesting complementary items (drinks with meals, sides, etc.)
6. If asked about the cart, provide helpful info about what's in it and the total
7. If the customer wants to submit/checkout, tell them to tap the Submit Order button

UPSELLING (be natural, not pushy):
- After they add food, suggest a drink if they don't have one
- Mention combos when they order individual items
- Suggest popular pairings based on what's in their cart

Example responses:
- "I want wings" → "Great choice! 🍗 We have **Buffalo Wings** (₱180) with our signature spicy sauce, or **Honey Garlic Wings** (₱200) for a sweeter taste!"
- "Something to drink" → "Perfect! Our **Iced Tea** (₱60) is refreshing, or try our **Mango Shake** (₱80) for something fruity!"
- "What's popular?" → "Our bestsellers are **Chicken Combo** (₱250) - comes with rice and a drink! Also, the **BBQ Wings** (₱180) are customer favorites."`
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

  // Handle adding item with size selection if needed
  const handleAddToCartWithSize = (item) => {
    const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
    
    if (sizes.length > 1) {
      // Multiple sizes - show size selection
      setPendingSizeSelection(item);
      const sizeMessage = {
        id: generateUniqueId(),
        text: `**${item.name}** comes in different sizes! Pick one:`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'size-selection',
        pendingItem: item
      };
      setMessages(prev => [...prev, sizeMessage]);
    } else {
      // Single size - add directly
      const size = sizes[0] || 'regular';
      onAddToCart(item, { size });
      
      const confirmMessage = {
        id: generateUniqueId(),
        text: `Added **${item.name}** to your cart! 🎉`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'cart-action'
      };
      setMessages(prev => [...prev, confirmMessage]);
    }
  };

  // Handle size selection callback
  const handleSizeSelected = (item, size) => {
    setPendingSizeSelection(null);
    setLastSuggestedItems([]); // Clear so "yes" doesn't re-add
    setConversationContext(null);
    onAddToCart(item, { size });
    
    const confirmMessage = {
      id: generateUniqueId(),
      text: `Added **${item.name}** (${size}) to your cart! 🎉`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'cart-action'
    };
    setMessages(prev => [...prev, confirmMessage]);
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
        handleSizeSelected(pendingSizeSelection, matchedSize);
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
    
    // ========== CHECK FOR SIZE RESPONSE WITH LAST SUGGESTED ITEM ==========
    // When AI asked about sizes and user types "medium" or "large"
    if (lastSuggestedItems.length === 1) {
      const item = lastSuggestedItems[0];
      const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
      if (sizes.length > 1) {
        const matchedSize = matchSizeFromInput(currentInput, sizes);
        if (matchedSize) {
          onAddToCart(item, { size: matchedSize });
          setLastSuggestedItems([]);
          const confirmMessage = {
            id: generateUniqueId(),
            text: `Added **${item.name}** (${matchedSize.toUpperCase()}) to your cart! 🎉 Anything else?`,
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
    
    // ========== CHECK FOR DIRECT ADD INTENT ==========
    if (detectDirectAddIntent(currentInput)) {
      const itemToAdd = findMenuItemFromInput(currentInput);
      if (itemToAdd) {
        const sizes = Object.keys(itemToAdd.pricing || {}).filter(k => k !== '_id');
        if (sizes.length > 1) {
          // Multiple sizes - show size selection
          setPendingSizeSelection(itemToAdd);
          setLastSuggestedItems([itemToAdd]);
          const sizeMessage = {
            id: generateUniqueId(),
            text: `**${itemToAdd.name}** comes in different sizes! Pick one:`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'size-selection',
            pendingItem: itemToAdd
          };
          setMessages(prev => [...prev, sizeMessage]);
          return;
        } else {
          // Single size - add directly!
          const size = sizes[0] || 'base';
          onAddToCart(itemToAdd, { size });
          setLastSuggestedItems([]);
          const confirmMessage = {
            id: generateUniqueId(),
            text: `Added **${itemToAdd.name}** to your cart! 🎉 Anything else?`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'cart-action'
          };
          setMessages(prev => [...prev, confirmMessage]);
          return;
        }
      }
    }

    // ========== CHECK FOR CONFIRMATION INTENT ==========
    if (detectConfirmationIntent(currentInput)) {
      const mentionedItem = findMenuItemFromInput(currentInput);
      
      if (mentionedItem) {
        const sizes = Object.keys(mentionedItem.pricing || {}).filter(k => k !== '_id');
        if (sizes.length > 1) {
          setPendingSizeSelection(mentionedItem);
          setLastSuggestedItems([mentionedItem]);
          const sizeMessage = {
            id: generateUniqueId(),
            text: `Great choice! **${mentionedItem.name}** comes in different sizes:`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'size-selection',
            pendingItem: mentionedItem
          };
          setMessages(prev => [...prev, sizeMessage]);
          return;
        } else {
          const size = sizes[0] || 'base';
          onAddToCart(mentionedItem, { size });
          const confirmMessage = {
            id: generateUniqueId(),
            text: `Added **${mentionedItem.name}** to your cart! 🎉`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'cart-action'
          };
          setMessages(prev => [...prev, confirmMessage]);
          return;
        }
      }
      
      // Check last suggested items
      if (lastSuggestedItems.length === 1) {
        const item = lastSuggestedItems[0];
        const sizes = Object.keys(item.pricing || {}).filter(k => k !== '_id');
        if (sizes.length > 1) {
          setPendingSizeSelection(item);
          const sizeMessage = {
            id: generateUniqueId(),
            text: `**${item.name}** comes in different sizes:`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'size-selection',
            pendingItem: item
          };
          setMessages(prev => [...prev, sizeMessage]);
          return;
        } else {
          const size = sizes[0] || 'base';
          onAddToCart(item, { size });
          setLastSuggestedItems([]);
          const confirmMessage = {
            id: generateUniqueId(),
            text: `Added **${item.name}** to your cart! 🎉 Anything else?`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'cart-action'
          };
          setMessages(prev => [...prev, confirmMessage]);
          return;
        }
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
      
      // Add helpful follow-up for suggestions
      if (suggestions.length > 0) {
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
            onSelectSize={handleSizeSelected}
            onCancelSize={handleSizeCancel}
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