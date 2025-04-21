import { useState, useRef, useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/solid';
import logo from './assets/rw.jpg'; // <-- Adjust path/filename if needed

function ChatbotPage() {
  // Color palette from your brand
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Chatbot Avatar Component (using your actual logo)
  const ChatbotAvatar = () => (
    <div className="w-8 h-8 mr-3 flex-shrink-0 rounded-full overflow-hidden">
      <img
        src={logo}
        alt="Ring & Wing Logo"
        className="object-cover w-full h-full"
      />
    </div>
  );

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm the Ring & Wing Café assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [menuData, setMenuData] = useState([]); // To store menu items from the backend
  const messagesEndRef = useRef(null);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const lastRequestTime = useRef(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef(null);

  // Sample menu suggestions for user convenience
  const menuSuggestions = [
    { id: 1, text: "What's today's special?" },
    { id: 2, text: "Do you have any coffee recommendations?" },
    { id: 3, text: "What are your operating hours?" },
    { id: 4, text: "Can I see the full menu?" }
  ];

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch menu items from your backend when the component mounts
  useEffect(() => {
    fetch("http://localhost:5000/api/menu")
      .then((res) => res.json())
      .then((data) => {
        // Check if data has items array (based on your API response structure)
        const items = data.items || [];
        setMenuData(items);
      })
      .catch((err) => console.error("Error fetching menu items:", err));
  }, []);

  // Function to format menu data for AI context
  const getMenuContext = () => {
    if (!menuData.length) return "No menu items available";
    
    return menuData.map(menuItem => {
      const prices = menuItem.pricing 
        ? Object.entries(menuItem.pricing)
            .map(([size, price]) => `${size}: ₱${price}`)
            .join(', ')
        : 'Price not available';
      
      return `- ${menuItem.name}: ${menuItem.description || 'No description'}. Prices: ${prices}. Category: ${menuItem.category || 'Uncategorized'}`;
    }).join('\n');
  };

  // Corrected sanitizeAIResponse function with all logic inside
  const sanitizeAIResponse = (text) => {
    if (!text || text.trim().length < 2) {
      return "Let me check that for you...";
    }
  
    // Remove all asterisks to avoid bold formatting issues
    const sanitizedText = text.replace(/\*/g, '');
    const lowerText = sanitizedText.toLowerCase();
  
    const genericResponses = [
      "i can help with",
      "how can i assist",
      "what would you like to know about",
      "i'm an ai assistant"
    ];
  
    const isGeneric = genericResponses.some(phrase =>
      lowerText.includes(phrase)
    );
  
    // Assuming menuData is available in scope
    const menuNames = menuData.map(item => item.name.toLowerCase());
    const mentionedItems = sanitizedText.split(/[\s.,]+/).filter(word =>
      menuNames.includes(word.toLowerCase())
    );
  
    if (isGeneric && lowerText.includes('special')) {
      const special = menuData.find(item => item.isSpecial) || menuData[0];
      return `Today's special is ${special.name} - ${special.description}`;
    }
  
    if (mentionedItems.length === 0 && lowerText.includes('recommend')) {
      const popularItems = menuData.slice(0, 3).map(i => i.name);
      return `${sanitizedText}\n\nPopular choices: ${popularItems.join(', ')}`;
    }
  
    return sanitizedText;
  };

  // Async function to get AI response using DeepSeek API via OpenRouter with restaurant context.
  // This function now accepts a 'chatHistory' parameter (an array of conversation messages)
  // which includes the last 5 messages for context.
  const getAIResponse = async (userInput, chatHistory = []) => {
    const API_KEY = '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';
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    
    const systemMessage = {
      role: "system",
      content: `You are Ring & Wing Café's helpful assistant. Rules:
1. Menu items (never invent new ones):
${getMenuContext()}
2. refrain from using bold letters as the chatbot doesn't support boldfaces.
3. using asterisk is probihited *.
3. Keep responses friendly but professional,
4. Never mention competitors
5. If the customer initiates a fun or playful interaction, the AI can engage in a lighthearted and friendly way while maintaining professionalism.
6. If asked about something not in the menu, respond: "I'm sorry, that item isn't available. Would you like me to suggest something from our menu?"
7. Format prices exactly as: "Small: ₱99 | Medium: ₱120
8. For recommendations, suggest 1 specific item first`
    };

    const payload = {
      model: "deepseek/deepseek-chat:free",
      messages: [
        systemMessage,
        ...chatHistory, // Last 5 messages (memory)
        { role: "user", content: userInput }
      ],
      temperature: 0.85, 
      max_tokens: 200, 
      presence_penalty: 0.6 
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ring-wing-cafe.com", // Required by OpenRouter
          "X-Title": "Ring & Wing Café Assistant" 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error(`DeepSeek API error: ${res.status}`);
      }
      const data = await res.json();
      let aiText = data.choices[0].message.content;
      aiText = sanitizeAIResponse(aiText);
      return aiText;
    } catch (error) {
      console.error("Error with DeepSeek API:", error);
      return "Sorry, I'm having trouble connecting to the AI service.";
    }
  };

  // Handle sending a message (async to await AI responses)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
  
    // Rate limiting check
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime.current;
    
    if (timeSinceLast < 1500) {
      const remaining = (1500 - timeSinceLast) / 1000;
      setRateLimitMessage(`Just a moment... (${remaining.toFixed(1)}s)`);
      setIsTyping(true);
      
      // Automatically clear after remaining time
      setTimeout(() => {
        setIsTyping(false);
        setRateLimitMessage('');
      }, 1500 - timeSinceLast);
      
      return;
    }
  
    lastRequestTime.current = now;
  
    // Add the user's message
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    // Update messages state and clear input
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
  
    // Build conversation history from the last 5 messages (after adding the user message)
    const chatHistory = [...messages, userMessage]
      .slice(-5)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
  
    const input = userMessage.text.toLowerCase();
    let botResponse;
  
    // Handle menu requests
    if (input.includes('menu')) {
      const aiText = await getAIResponse(userMessage.text, chatHistory);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: aiText,
        sender: 'bot',
        timestamp: new Date()
      }]);
  
      const menuMessage = {
        id: Date.now() + 1,
        text: "",
        sender: 'bot',
        type: 'menu-items',
        items: menuData.map(item => ({
          name: item.name,
          price: item.pricing ? "₱" + Object.values(item.pricing)[0] : "",
          description: item.description || "",
          image: item.image || ""
        })),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, menuMessage]);
      setIsTyping(false);
      return;
    }
  
    // Handle coffee requests without duplication
    if (input.includes('coffee')) {
      const coffeeItems = menuData
        .filter(menuItem => 
          menuItem.category === 'Beverages' && 
          menuItem.subCategory === 'Coffee'
        )
        .map(menuItem => ({
          name: menuItem.name,
          prices: menuItem.pricing ? 
            Object.entries(menuItem.pricing).map(([size, price]) => ({
              size,
              price: `₱${price}`
            })) : [],
          description: menuItem.description || "",
          image: menuItem.image || ""
        }));
  
      if (coffeeItems.length === 0) {
        // If no coffee items found in database
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "We currently don't have coffee items available. Please check back later!",
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }
  
      const aiText = await getAIResponse(userMessage.text, chatHistory);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: aiText,
          sender: 'bot',
          timestamp: new Date()
        },
        {
          id: Date.now() + 1,
          text: "",
          sender: 'bot',
          type: 'menu-items',
          items: coffeeItems,
          timestamp: new Date()
        }
      ]);
      setIsTyping(false);
      return;
    }
  
    // Default case: get AI response
    const aiText = await getAIResponse(userMessage.text, chatHistory);
    botResponse = {
      id: Date.now(),
      text: aiText,
      sender: 'bot',
      timestamp: new Date()
    };
  
    setMessages(prev => [...prev, botResponse]);
    setIsTyping(false);
  };

  // Handle suggestion button clicks
  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  // Handle order action when a menu item is selected from the chat response
  const handleOrderItem = (itemName) => {
    const userMessage = {
      id: Date.now(),
      text: `I'd like to order ${itemName}`,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Added ${itemName} to your order. Would you like anything else?`,
        sender: 'bot',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
      {/* Header with Avatar */}
      <header className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: colors.primary, borderColor: colors.muted }}>
        <div className="flex items-center">
          <ChatbotAvatar />
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.background }}>Café Assistant</h1>
            <p className="text-xs" style={{ color: colors.muted }}>Powered by Ring & Wing</p>
          </div>
        </div>
        <div className="flex items-center relative">
          <span
            className="h-3 w-3 rounded-full mr-1 absolute -left-5"
            style={{
              backgroundColor: '#4ade80',
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
            }}
          ></span>
          <span className="text-sm" style={{ color: colors.background }}>
            Online
          </span>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 items-start ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && <ChatbotAvatar />}
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${message.sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                style={{
                  backgroundColor: message.sender === 'user' ? colors.accent : colors.muted + '30',
                  color: message.sender === 'user' ? colors.background : colors.primary
                }}
              >
                <p>{message.text}</p>

                {/* Display menu items if bot response has type 'menu-items' */}
                {message.type === 'menu-items' && (
                  <div className="mt-2 space-y-3">
                    {message.items.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg flex items-start"
                        style={{ backgroundColor: colors.muted + '15', border: `1px solid ${colors.muted}` }}
                      >
                       <div className="w-16 h-16 rounded-md mr-3 flex items-center justify-center bg-gray-200 text-gray-500">
  {item.image ? (
    <img 
    src={`http://localhost:5000${item.image}`}
      alt={item.name} 
      className="object-cover w-full h-full rounded-md"
      onError={(e) => {
        e.target.onerror = null; 
        e.target.src = '/placeholder-food.jpg';
      }}
    />
  ) : (
    <span className="text-xs text-center">No Image</span>
  )}
</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold" style={{ color: colors.primary }}>
                              {item.name}
                            </h3>
                            <span className="font-medium" style={{ color: colors.accent }}>
                              {item.price}
                            </span>
                          </div>
                          <p className="text-sm mt-1" style={{ color: colors.secondary }}>
                            {item.description}
                          </p>
                          <button
                            onClick={() => handleOrderItem(item.name)}
                            className="add-to-order-btn"
                            style={{
                              backgroundColor: colors.accent,
                              color: colors.background
                            }}
                          >
                            Add to Order
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p
                  className="text-xs mt-1"
                  style={{
                    color: message.sender === 'user' ? "#fefdfd" : colors.primary + 'aa',
                    textAlign: message.sender === 'user' ? 'right' : 'left'
                  }}
                >
                  {message.timestamp.toLocaleTimeString('en-PH', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex mb-4 justify-start items-center">
              <ChatbotAvatar />
              <div
                className="rounded-lg rounded-tl-none px-4 py-2 flex items-center"
                style={{
                  backgroundColor: colors.muted + '30',
                  animation: !rateLimitMessage ? 'pulse 1.5s cubic-bezier(0, 0, 0.6, 1) infinite' : 'none',
                  minWidth: '80px'
                }}
              >
                {rateLimitMessage ? (
                  <span 
                    className="italic text-sm"
                    style={{ color: colors.muted }}
                  >
                    {rateLimitMessage}
                  </span>
                ) : (
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }}></div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }}></div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }}></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-2">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
          {menuSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion.text)}
              className="suggestion-btn"
              style={{
                backgroundColor: colors.muted + '20',
                color: colors.primary,
                border: `1px solid ${colors.muted}`
              }}
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t" style={{ borderColor: colors.muted }}>
        <div className="max-w-3xl mx-auto flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message or choose a suggestion below..."
            className="chat-input"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.muted}`,
              color: colors.primary
            }}
          />
         <button
  type="submit"
  disabled={!inputMessage.trim() || isTyping} // Add isTyping condition here
  className={`send-button ${isProcessing ? 'processing' : ''}`}
  style={{
    backgroundColor: colors.accent,
    color: colors.background,
    opacity: (!inputMessage.trim() || isTyping) ? 0.7 : 1,
    cursor: (!inputMessage.trim() || isTyping) ? 'not-allowed' : 'pointer'
  }}
>
  <ArrowUpIcon className="w-4 h-4" />
</button>
        </div>
      </form>

      {/* CSS for animations and hover effects */}
      <style jsx>{`
        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Suggestion button styles */
        .suggestion-btn {
          font-size: 0.875rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          transition: all 0.2s ease;
        }

        .suggestion-btn:hover {
          background-color: ${colors.accent}20 !important;
          border-color: ${colors.accent} !important;
        }

        /* Chat input styles */
        .chat-input {
          flex: 1;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem 0 0 0.5rem;
          outline: none;
          transition: all 0.2s ease;
          border-right: none;
        }

        .chat-input:focus {
          border-color: ${colors.accent};
          box-shadow: 0 0 0 1px ${colors.accent};
        }

        /* Send button styles */
        .send-button {
          padding: 0.5rem 1rem;
          border-radius: 0 0.5rem 0.5rem 0;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
        }

        .send-button:hover:not(:disabled) {
          opacity: 0.9 !important;
        }

        /* Add to Order button styles */
        .add-to-order-btn {
          transition: all 0.2s ease;
          margin-top: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
        }

        .add-to-order-btn:hover {
          background-color: ${colors.accent}dd !important;
        }
      `}</style>
    </div>
  );
}

export default ChatbotPage;
