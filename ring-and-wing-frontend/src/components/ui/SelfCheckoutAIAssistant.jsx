import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../App';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b'
};

// AI Avatar Component
const AIAvatar = ({ isListening = false, isThinking = false }) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
    isListening ? 'animate-pulse' : isThinking ? 'animate-spin' : ''
  }`} style={{ backgroundColor: colors.accent }}>
    <svg 
      className="w-5 h-5 text-white" 
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

AIAvatar.propTypes = {
  isListening: PropTypes.bool,
  isThinking: PropTypes.bool
};

// Message Component
const ChatMessage = ({ message, onAddToCart, menuItems }) => {
  if (message.type === 'menu-suggestions') {
    return (
      <div className="space-y-3">
        <p className="text-sm" style={{ color: colors.primary }}>{message.text}</p>
        <div className="grid grid-cols-1 gap-3">
          {message.suggestions?.map((item, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden relative"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* System Alternative Badge */}
              {item.isSystemAlternative && (
                <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                     style={{ backgroundColor: colors.primary }}>
                  ⭐ RECOMMENDED
                </div>
              )}
              
              <div className="flex p-3">
                <div className="w-16 h-16 flex-shrink-0 mr-3">
                  <img 
                    src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
                    }}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 leading-tight mb-1">
                      {item.name}
                      {item.isSystemAlternative && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          (Chef's Alternative)
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.code}</span>
                      <span 
                        className="font-bold text-sm"
                        style={{ color: colors.primary }}
                      >
                        ₱{item.price}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onAddToCart(item)}
                    className="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-white transition-all duration-200 active:scale-95"
                    style={{ backgroundColor: colors.accent }}
                  >
                    🛒 Add to Cart
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-xs p-3 rounded-2xl ${
      message.sender === 'user' 
        ? 'ml-auto text-white' 
        : 'mr-auto'
    }`} style={{ 
      backgroundColor: message.sender === 'user' ? colors.accent : colors.background,
      color: message.sender === 'user' ? 'white' : colors.primary,
      border: message.sender === 'bot' ? `1px solid ${colors.muted}` : 'none'
    }}>
      <p className="text-sm">{message.text}</p>
      {message.timestamp && (
        <p className="text-xs mt-1 opacity-70">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    text: PropTypes.string.isRequired,
    sender: PropTypes.string.isRequired,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    type: PropTypes.string,
    suggestions: PropTypes.array
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
  menuItems: PropTypes.array.isRequired
};

const SelfCheckoutAIAssistant = ({ 
  menuItems = [], 
  currentOrder = [], 
  onAddToCart = () => {},
  onOrderSuggestion = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your ordering assistant. I can help you find items, suggest combinations, or answer questions about our menu. What would you like to try today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate unique ID for messages
  const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

  // Get AI response using your existing Gemini integration
  const getAIResponse = async (userInput, signal = null) => {
    const menuContext = menuItems.map(item => {
      const prices = item.pricing ? 
        Object.entries(item.pricing)
          .map(([size, price]) => `${size}: ₱${price}`)
          .join(', ')
        : 'Price not available';
      
      return `- ${item.name}: ${item.description || 'No description'}. Prices: ${prices}. Category: ${item.category || 'Uncategorized'}. Available: ${item.isAvailable !== false}`;
    }).join('\n');

    const currentOrderContext = currentOrder.length > 0 
      ? `Current order: ${currentOrder.map(item => `${item.name} (${item.selectedSize}) x${item.quantity}`).join(', ')}`
      : 'No items in cart yet';

    const systemMessage = {
      role: "system",
      content: `You are a helpful ordering assistant for Ring & Wings restaurant's self-checkout system. You help customers place orders using natural language.

CURRENT MENU:
${menuContext}

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

  // Extract menu suggestions from AI response with better parsing
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
      
      // Merge system alternatives with AI-suggested items, prioritizing system ones
      const uniqueSuggestions = [...systemSuggestions];
      suggestions.forEach(suggestion => {
        if (!systemSuggestions.find(sys => sys._id === suggestion._id)) {
          uniqueSuggestions.push(suggestion);
        }
      });
      
      return uniqueSuggestions.slice(0, 4);
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions max
  };

  // Handle sending message with enhanced processing
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

      // Check if this was an unavailable item query to pass context for suggestions
      const isUnavailableQuery = detectUnavailableItemIntent(currentInput);
      const itemName = isUnavailableQuery ? extractItemNameFromInput(currentInput) : null;
      
      let suggestionContext = {};
      if (isUnavailableQuery && itemName) {
        // Try to get system alternatives for context
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
            console.log('Could not fetch system alternatives for context:', error);
          }
        }
      }

      const suggestions = extractMenuSuggestions(aiResponse, suggestionContext);
      
      const botMessage = {
        id: generateUniqueId(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: suggestions.length > 0 ? 'menu-suggestions' : 'text',
        suggestions: suggestions
      };

      setMessages(prev => [...prev, botMessage]);

      // Enhanced follow-up for different types of interactions
      if (suggestions.length > 0) {
        setTimeout(() => {
          let followUpText = "Tap any item above to add it to your cart! 😊";
          
          if (isUnavailableQuery) {
            followUpText = "These alternatives should satisfy your craving! Tap any item to add it to your cart, or let me know if you'd like other suggestions. 😊";
          } else if (detectOrderIntent(currentInput)) {
            followUpText = "Perfect choices! Tap any item to add to your cart, or tell me if you'd like something different! 😊";
          }
          
          const followUpMessage = {
            id: generateUniqueId(),
            text: followUpText,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, followUpMessage]);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage = {
        id: generateUniqueId(),
        text: "Sorry, I'm having trouble right now. Please try again or browse the menu directly.",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  // Enhanced order intent detection
  const detectOrderIntent = (userInput) => {
    const orderKeywords = [
      'want', 'need', 'order', 'get', 'buy', 'take', 'have',
      'i\'ll have', 'i\'ll take', 'give me', 'can i get',
      'hungry', 'thirsty', 'craving'
    ];

    const lowerInput = userInput.toLowerCase();
    return orderKeywords.some(keyword => lowerInput.includes(keyword));
  };

  // Detect when user is asking about unavailable items
  const detectUnavailableItemIntent = (userInput) => {
    const unavailableKeywords = [
      'unavailable', 'not available', 'out of stock', 'sold out',
      'can\'t order', 'not working', 'alternative', 'substitute',
      'replacement', 'similar', 'instead', 'other options'
    ];

    const lowerInput = userInput.toLowerCase();
    return unavailableKeywords.some(keyword => lowerInput.includes(keyword));
  };

  // Get contextual alternatives using Gemini AI and existing alternatives system
  const getContextualAlternatives = async (unavailableItemName, userContext = '', signal = null) => {
    try {
      // First, try to find the unavailable item by name
      const unavailableItem = menuItems.find(item => 
        item.name.toLowerCase().includes(unavailableItemName.toLowerCase()) ||
        unavailableItemName.toLowerCase().includes(item.name.toLowerCase())
      );

      let systemAlternatives = [];
      
      // If we found the item, get its predefined alternatives
      if (unavailableItem) {
        try {
          const response = await fetch(`/api/menu/${unavailableItem._id}/alternatives`);
          if (response.ok) {
            const data = await response.json();
            systemAlternatives = data.alternatives || [];
          }
        } catch (error) {
          console.log('Could not fetch system alternatives:', error);
        }
      }

      // Get available menu items for AI context
      const availableItems = menuItems.filter(item => item.isAvailable !== false);
      const menuContext = availableItems.map(item => {
        const prices = item.pricing ? 
          Object.entries(item.pricing)
            .map(([size, price]) => `${size}: ₱${price}`)
            .join(', ')
          : 'Price not available';
        
        return `- ${item.name}: ${item.description || 'No description'}. Prices: ${prices}. Category: ${item.category}`;
      }).join('\n');

      // Create context about system alternatives if available
      const systemAltsContext = systemAlternatives.length > 0 
        ? `Predefined alternatives for ${unavailableItemName}: ${systemAlternatives.map(alt => alt.name).join(', ')}.`
        : '';

      const systemMessage = {
        role: "system",
        content: `You are helping a customer find alternatives for an unavailable menu item. Provide intelligent suggestions based on flavor profile, price range, and popularity.

UNAVAILABLE ITEM: ${unavailableItemName}
${systemAltsContext}

AVAILABLE MENU ITEMS:
${menuContext}

CUSTOMER CONTEXT: ${userContext}

Guidelines:
1. Suggest 2-4 specific alternatives that are similar in flavor, price, or category
2. Consider the customer's expressed preferences or dietary needs
3. Prioritize items in similar price ranges
4. Mention why each alternative is a good substitute (similar taste, popular choice, etc.)
5. Be empathetic about the unavailability
6. Keep suggestions concise and actionable
7. Use Filipino pesos (₱) for prices
8. If system alternatives exist, prioritize those but add your reasoning

Example response format:
"I'm sorry ${unavailableItemName} isn't available right now! Here are some great alternatives:

1. [Item Name] (₱[price]) - Similar flavor profile with [reason]
2. [Item Name] (₱[price]) - Popular choice that customers love
3. [Item Name] (₱[price]) - Same category with [unique feature]

Would any of these work for you?"`
      };

      const payload = {
        model: "gemini-2.5-flash",
        messages: [
          systemMessage,
          { role: "user", content: `I wanted to order ${unavailableItemName} but it's unavailable. ${userContext}` }
        ],
        temperature: 0.8,
        max_tokens: 400
      };

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

      return {
        aiResponse: data.choices[0].message.content.trim(),
        systemAlternatives,
        unavailableItem
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      console.error("Contextual Alternatives Error:", error);
      return {
        aiResponse: `I'm sorry ${unavailableItemName} isn't available. Let me suggest some similar items from our menu. What type of flavors do you usually enjoy?`,
        systemAlternatives: [],
        unavailableItem: null
      };
    }
  };

  // Handle adding suggested item to cart
  const handleAddToCart = (item) => {
    // Use the default size or base size for quick add
    const sizes = Object.keys(item.pricing || {});
    const selectedSize = item.defaultSize || (sizes.includes('base') ? 'base' : sizes[0]) || 'regular';
    
    onAddToCart(item, selectedSize);
    
    // Add confirmation message with next steps
    const confirmMessage = {
      id: generateUniqueId(),
      text: `Added ${item.name} to your cart! 🛒 Want to add a drink or try something else?`,
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, confirmMessage]);
  };

  // Enhanced message processing with better natural language understanding
  const processUserMessage = async (userInput) => {
    // Check for unavailable item intent first
    const unavailableItemDetected = detectUnavailableItemIntent(userInput);
    
    if (unavailableItemDetected) {
      // Extract item name from user input
      const itemNameMatch = extractItemNameFromInput(userInput);
      
      if (itemNameMatch) {
        // Get contextual alternatives using AI + system alternatives
        const alternativesResult = await getContextualAlternatives(
          itemNameMatch, 
          userInput, 
          abortControllerRef.current?.signal
        );
        
        if (alternativesResult === null) return null; // Request was cancelled
        
        return alternativesResult.aiResponse;
      }
    }
    
    // Check for common ordering patterns
    const orderIntentDetected = detectOrderIntent(userInput);
    
    if (orderIntentDetected) {
      // Add context about ordering intent to help AI respond appropriately
      const enhancedInput = `[Customer wants to order] ${userInput}`;
      return await getAIResponse(enhancedInput, abortControllerRef.current?.signal);
    }
    
    return await getAIResponse(userInput, abortControllerRef.current?.signal);
  };

  // Extract item name from user input for unavailable item queries
  const extractItemNameFromInput = (userInput) => {
    // Look for menu item names mentioned in the input
    const lowerInput = userInput.toLowerCase();
    
    for (const item of menuItems) {
      const itemNameLower = item.name.toLowerCase();
      if (lowerInput.includes(itemNameLower)) {
        return item.name;
      }
      
      // Also check for partial matches (e.g., "wings" for "Buffalo Wings")
      const itemWords = itemNameLower.split(' ');
      for (const word of itemWords) {
        if (word.length > 3 && lowerInput.includes(word)) {
          return item.name;
        }
      }
    }
    
    // If no specific item found, extract potential item name from common patterns
    const patterns = [
      /(?:want|order|get|have)\s+(.+?)(?:\s+but|\s+is|\s+not|$)/i,
      /(.+?)\s+(?:is|isn't|not)\s+available/i,
      /alternative\s+(?:to|for)\s+(.+?)(?:\s|$)/i,
      /instead\s+of\s+(.+?)(?:\s|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = userInput.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick action buttons
  const quickActions = [
    { text: "What's popular?", action: () => setInputText("What are your most popular items?") },
    { text: "Recommend drinks", action: () => setInputText("What drinks go with my order?") },
    { text: "Find alternatives", action: () => setInputText("I wanted Buffalo Wings but it's unavailable") },
    { text: "Help me choose", action: () => setInputText("I'm not sure what to order, can you help?") }
  ];

  // Floating AI button (collapsed state)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full p-3 shadow-lg"
          style={{ backgroundColor: colors.accent }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
        >
          <AIAvatar />
          
          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white">!</span>
          </div>
          
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full border-2 border-orange-300 animate-ping"></div>
        </motion.button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal - Mobile Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl w-full shadow-2xl flex flex-col"
            style={{ height: '80vh' }}
            initial={{ 
              y: '100%',
              opacity: 0 
            }}
            animate={{ 
              y: 0,
              opacity: 1 
            }}
            exit={{ 
              y: '100%',
              opacity: 0 
            }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 400
            }}
          >
            {/* Header */}
            <div className="flex-none p-4 pb-2 border-b border-gray-200 relative">
              {/* Pull indicator */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full"></div>
              
              <div className="flex items-start justify-between mt-3">
                <div className="flex items-center space-x-3">
                  <AIAvatar isThinking={isThinking} />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      AI Assistant
                    </h2>
                    <p className="text-sm text-gray-600">
                      {isThinking ? 'Thinking...' : 'Ready to help with your order'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 px-4 py-2 overflow-y-auto">
              {/* Messages */}
              <div className="space-y-3 mb-4">
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    onAddToCart={handleAddToCart}
                    menuItems={menuItems}
                  />
                ))}
                
                {isThinking && (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs">AI is thinking...</span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {messages.length <= 2 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.slice(0, 4).map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className="px-3 py-2 text-xs rounded-full border transition-colors"
                        style={{ 
                          borderColor: colors.muted, 
                          color: colors.secondary,
                          backgroundColor: colors.background
                        }}
                      >
                        {action.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Footer - Fixed at bottom */}
            <div className="flex-none p-4 pt-2 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about our menu..."
                  className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  disabled={isThinking}
                />
                
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isThinking}
                  className="px-4 py-3 rounded-full text-white transition-all disabled:opacity-50 shadow-md"
                  style={{ backgroundColor: colors.accent }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

SelfCheckoutAIAssistant.propTypes = {
  menuItems: PropTypes.array,
  currentOrder: PropTypes.array,
  onAddToCart: PropTypes.func,
  onOrderSuggestion: PropTypes.func
};

export default SelfCheckoutAIAssistant;
