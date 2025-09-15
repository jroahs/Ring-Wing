import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '../../hooks/useBreakpoint';

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

// Enhanced Message Component with suggestions, photos, and expandable descriptions
const ChatMessage = ({ message, onAddToCart, menuItems = [] }) => {
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

  if (message.type === 'menu-suggestions') {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <AIAvatar size="small" />
          <div className="max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl bg-gray-100 text-gray-800">
            <p className="text-sm">{message.text}</p>
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
                  onClick={() => onAddToCart(menuItem)}
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
        <p className="text-sm">{message.text}</p>
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
    isThinking: PropTypes.bool
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
  menuItems: PropTypes.array
};

// Main AssistantPanel Component with full AI functionality
const AssistantPanel = ({ 
  menuItems = [], 
  currentOrder = [], 
  onAddToCart = () => {},
  onOrderSuggestion = () => {}
}) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  
  // State management
  const [isOpen, setIsOpen] = useState(false);
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
        const response = await fetch('/api/categories');
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
            text: "Here are some popular items to get you started! 😊",
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
      ? `Current order: ${currentOrder.map(item => `${item.name} (${item.selectedSize}) x${item.quantity}`).join(', ')}`
      : 'No items in cart yet';

    const systemMessage = {
      role: "system",
      content: `You are a helpful ordering assistant for Ring & Wings restaurant's self-checkout system. You help customers place orders using natural language.

CURRENT MENU:
${menuContext}${categoryContext}

CUSTOMER'S CURRENT ORDER:
${currentOrderContext}

Guidelines:
1. Be friendly, concise, and helpful - you're assisting with self-checkout
2. Help customers find items, suggest combinations, and answer menu questions
3. When customers express interest in items, suggest specific menu items with prices
4. Keep responses short (1-2 sentences max for mobile interface)
5. Use Filipino pesos (₱) for prices
6. If items are unavailable, suggest alternatives from available menu
7. For recommendations, consider what's already in their cart for good pairings
8. Help with natural language ordering (e.g., "I want chicken wings" → suggest specific wing items)
9. Don't use markdown formatting - plain text only
10. If someone says they want to order something, provide specific menu options
11. Be proactive in suggesting complementary items (drinks with meals, sides, etc.)

Example responses:
- User: "I want chicken wings" → "Great! We have Buffalo Wings (₱180) and Honey Garlic Wings (₱200). Which would you prefer?"
- User: "Something to drink" → "Perfect! Try our Iced Tea (₱60) or Fresh Juice (₱80). What sounds good?"
- User: "I'm hungry" → "I can help! Our Chicken Combo (₱250) is popular, or try our BBQ Plate (₱220). What are you in the mood for?"`
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
      const res = await fetch('/api/chat', {
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

  // Process user message with full AI functionality
  const processUserMessage = async (userInput) => {
    try {
      // Enhanced input processing for better context
      const isUnavailableQuery = detectUnavailableItemIntent(userInput);
      
      if (isUnavailableQuery) {
        const itemName = extractItemNameFromInput(userInput);
        const enhancedInput = `The customer is asking about "${itemName}" which might not be available. Please suggest similar alternatives from our menu with specific items and prices.`;
        return await getAIResponse(enhancedInput, abortControllerRef.current?.signal);
      }
      
      return await getAIResponse(userInput, abortControllerRef.current?.signal);
    } catch (error) {
      console.error('Error processing user message:', error);
      return "Sorry, I'm having trouble right now. Please try again in a moment.";
    }
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
    setIsThinking(true);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const aiResponse = await processUserMessage(currentInput);
      
      if (aiResponse === null) return; // Request was cancelled

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

      // Add follow-up message for suggestions
      if (suggestions.length > 0) {
        setTimeout(() => {
          let followUpText = "Tap any item above to add it to your cart! 😊";
          
          if (isUnavailableQuery) {
            followUpText = "These alternatives should satisfy your craving! Tap any item to add it to your cart, or let me know if you'd like other suggestions. 😊";
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

  // Layout-specific rendering based on breakpoint
  if (isMobile) {
    return (
      <>
        {/* Floating Action Button */}
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
                    onAddToCart={onAddToCart}
                    menuItems={menuItems}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

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
                onAddToCart={onAddToCart}
                menuItems={menuItems}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

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
                  onAddToCart={onAddToCart}
                  menuItems={menuItems}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

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
  onOrderSuggestion: PropTypes.func
};

export default AssistantPanel;