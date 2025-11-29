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
const ChatMessage = ({ message, onAddToCart, menuItems = [] }) => {
  if (message.type === 'menu-suggestions') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <AIAvatar size="small" />
          <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-gray-100 text-gray-800">
            <p className="text-sm">{message.text}</p>
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

// Main Embedded Assistant Component
const EmbeddedAssistant = ({ 
  menuItems = [], 
  currentOrder = [], 
  onAddToCart = () => {},
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
      content: `You are a helpful ordering assistant for Ring & Wings restaurant's self-checkout system. Help customers with their orders.

MENU:
${menuContext}

CUSTOMER'S CART:
${currentOrderContext}

Guidelines:
1. Be friendly and concise (1-2 sentences max)
2. Suggest specific items with prices when asked
3. Use ₱ for prices
4. Don't use markdown formatting
5. If asked about the cart, provide helpful info about what's in it
6. If the customer wants to order/submit/checkout, tell them to tap the "Submit Order" button below
7. Suggest complementary items based on what's in their cart`
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
    setIsThinking(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const aiResponse = await getAIResponse(currentInput, abortControllerRef.current.signal);
      
      if (aiResponse === null) return;

      const suggestions = extractMenuSuggestions(aiResponse);
      
      const botMessage = {
        id: generateUniqueId(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: suggestions.length > 0 ? 'menu-suggestions' : 'text',
        suggestions
      };

      setMessages(prev => [...prev, botMessage]);
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
            onAddToCart={onAddToCart}
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
  onSubmitOrder: PropTypes.func,
  isAuthenticated: PropTypes.bool,
  cartTotal: PropTypes.number
};

export default EmbeddedAssistant;
