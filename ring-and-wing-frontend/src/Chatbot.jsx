import { useState, useRef, useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/solid';
import { FiShoppingCart, FiClock, FiCheckCircle, FiInfo } from 'react-icons/fi';
import logo from './assets/rw.jpg';

function ChatbotPage() {
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  const ChatbotAvatar = () => (
    <div className="w-8 h-8 mr-3 flex-shrink-0 rounded-full overflow-hidden">
      <img
        src={logo}
        alt="Ring & Wing Logo"
        className="object-cover w-full h-full"
      />
    </div>
  );

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
  const [menuData, setMenuData] = useState([]);
  const messagesEndRef = useRef(null);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const lastRequestTime = useRef(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef(null);

  // Order management state variables
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    tableNumber: ''
  });
  const [showCheckout, setShowCheckout] = useState(false);

  const menuSuggestions = [
    { id: 1, text: "What's today's special?" },
    { id: 2, text: "What do you recommend?" },
    { id: 3, text: "Place an order" },
    { id: 4, text: "Where's my order?" },
    { id: 5, text: "Can i see the full menu?" }
  ];

  const orderSuggestions = [
    { id: 1, text: "Place an order" },
    { id: 2, text: "Track my order" },
    { id: 3, text: "Check order status" },
    { id: 4, text: "Cancel my order" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch("http://localhost:5000/api/menu")
      .then((res) => res.json())
      .then((data) => {
        const items = data.items || [];
        setMenuData(items);
      })
      .catch((err) => console.error("Error fetching menu items:", err));
  }, []);

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

  const sanitizeAIResponse = (text) => {
    if (!text || text.trim().length < 2) {
      return "Let me check that for you...";
    }
  
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

  // Updated AI response function with proxy implementation
  const getAIResponse = async (userInput, chatHistory = []) => {
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
        ...chatHistory,
        { role: "user", content: userInput }
      ],
      temperature: 0.85,
      max_tokens: 200,
      presence_penalty: 0.6
    };

    try {
      // Updated to use proxy endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      let aiText = data.choices[0].message.content;
      aiText = sanitizeAIResponse(aiText);
      return aiText;
    } catch (error) {
      console.error("Error with AI service:", error);
      return "Sorry, I'm having trouble connecting to the AI service.";
    }
  };

  // Order management functions
  const addToCurrentOrder = (item, size = 'base') => {
    const existingItemIndex = currentOrder.findIndex(
      orderItem => orderItem.name === item.name && orderItem.selectedSize === size
    );

    if (existingItemIndex !== -1) {
      // Update quantity if item already in order
      const updatedOrder = [...currentOrder];
      updatedOrder[existingItemIndex].quantity += 1;
      setCurrentOrder(updatedOrder);
    } else {
      // Add new item to order
      const sizePrice = item.pricing && item.pricing[size] 
        ? item.pricing[size] 
        : (item.pricing && Object.values(item.pricing)[0]) || 0;
        
      setCurrentOrder([
        ...currentOrder,
        {
          id: Date.now(),
          name: item.name,
          selectedSize: size,
          price: sizePrice,
          quantity: 1,
          image: item.image
        }
      ]);
    }
    
    // Show cart message if this is the first item
    if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "I've started an order for you. You can say 'show my cart' anytime to see your current order.",
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  };

  const updateOrderQuantity = (itemId, change) => {
    const updatedOrder = currentOrder.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean);
    
    setCurrentOrder(updatedOrder);
  };
  
  const removeFromOrder = (itemId) => {
    setCurrentOrder(currentOrder.filter(item => item.id !== itemId));
  };

  const calculateOrderTotal = () => {
    return currentOrder.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getEstimatedPrepTime = () => {
    // Base time: 5 minutes
    let baseTime = 5;
    
    // Add 1 minute per item type
    const uniqueItems = new Set(currentOrder.map(item => item.name));
    baseTime += uniqueItems.size;
    
    // Add 2 minutes if more than 5 total items
    const totalItems = currentOrder.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 5) baseTime += 2;
    
    // Add random variance (0-3 minutes)
    const variance = Math.floor(Math.random() * 4);
    
    return baseTime + variance;
  };

  const handleOrderItem = (item) => {
    // Get first available size or default to 'base'
    const size = item.pricing ? Object.keys(item.pricing)[0] : 'base';
    
    // Find the matching menu item with full data
    const menuItem = menuData.find(menuItem => menuItem.name === item.name) || item;
    
    // Add to order
    addToCurrentOrder(menuItem, size);
    
    const userMessage = {
      id: Date.now(),
      text: `I'd like to order ${item.name}`,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Added ${item.name} to your order. Would you like anything else?`,
        sender: 'bot',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1000);
  };

  // Order management action handlers
  const handleShowCart = () => {
    setShowCart(true);
    setIsTyping(false);
    
    if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "You don't have any items in your order yet. Would you like to see our menu?",
        sender: 'bot',
        timestamp: new Date()
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `You have ${currentOrder.length} item${currentOrder.length > 1 ? 's' : ''} in your order. You can view your cart below.`,
        sender: 'bot',
        type: 'cart',
        timestamp: new Date()
      }]);
    }
  };
  
  const handleCheckout = () => {
    if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "You don't have any items in your order yet. Would you like to see our menu?",
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    }

    setShowCheckout(true);
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: "Great! I'll need a few details to process your order.",
      sender: 'bot',
      timestamp: new Date()
    }]);
  };
  
  const sendOrderToBackend = async (order) => {
    console.log("Sending order to backend:", order);
    
    // Format the order to exactly match what SelfCheckout.jsx uses
    const orderData = {
      items: order.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize
      })),
      totals: {
        subtotal: order.total,
        discount: 0,
        total: order.total
      },
      paymentMethod: 'pending',
      orderType: 'chatbot',
      status: 'pending'
    };
  
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      console.log("Order submitted successfully:", data);
      return data.data.receiptNumber; // Match the expected response structure
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("There was a problem submitting your order. Please try again.");
      return null;
    }
  };

  const handlePlaceOrder = () => {
    if (currentOrder.length === 0) {
      alert("You need to add items to your order first.");
      return;
    }
    
    if (!customerInfo.name || !customerInfo.phone) {
      alert("Please fill in your name and phone number.");
      return;
    }
    
    // Generate a unique order number and estimated time
    const orderNumber = `RNW-${Date.now().toString().slice(-6)}`;
    const estimatedTime = getEstimatedPrepTime();
    
    // Create the order object
    const order = {
      id: orderNumber,
      items: [...currentOrder],
      customer: {...customerInfo},
      total: calculateOrderTotal(),
      status: 'pending', // Mark as pending for POS to handle payment
      paymentMethod: 'pending', // Payment will be processed at POS
      orderType: 'chatbot',
      estimatedMinutes: estimatedTime,
      placedAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to order history
    setOrderHistory(prev => [...prev, order]);
    
    // Send order to backend
    sendOrderToBackend(order);
    
    // Reset order and checkout
    setCurrentOrder([]);
    setShowCheckout(false);
    setShowCart(false);
    
    // Send confirmation message
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `Thank you for your order! Your order #${orderNumber} has been placed successfully. Please proceed to the counter for payment. After payment, your order should be ready in approximately ${estimatedTime} minutes. You can ask "Where's my order?" anytime to check the status.`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'order-confirmation',
      order: order
    }]);
  };
  
  const handleTrackOrder = () => {
    if (orderHistory.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "You don't have any recent orders to track. Would you like to place an order?",
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    }
    
    // Get most recent order
    const latestOrder = orderHistory[orderHistory.length - 1];
    
    // Calculate time elapsed since order was placed
    const now = new Date();
    const placedAt = new Date(latestOrder.placedAt);
    const minutesElapsed = Math.floor((now - placedAt) / 60000);
    
    // Set status based on time elapsed
    let status = latestOrder.status;
    let timeRemaining = latestOrder.estimatedMinutes - minutesElapsed;
    
    // Auto-update status based on elapsed time (for demo purposes)
    if (timeRemaining <= 0) {
      status = 'ready';
    } else if (minutesElapsed >= 2) {
      status = 'preparing';
    }
    
    // Update order status in history
    if (status !== latestOrder.status) {
      setOrderHistory(prev => 
        prev.map(order => 
          order.id === latestOrder.id 
            ? { ...order, status, updatedAt: new Date() } 
            : order
        )
      );
    }
    
    let statusMessage = '';
    
    switch(status) {
      case 'received':
        statusMessage = `Your order #${latestOrder.id} has been received and will be prepared soon! Estimated wait time: ${timeRemaining} minutes.`;
        break;
      case 'preparing':
        statusMessage = `Your order #${latestOrder.id} is being prepared right now! It should be ready in about ${timeRemaining > 0 ? timeRemaining : 'a few'} minutes.`;
        break;
      case 'ready':
        statusMessage = `Great news! Your order #${latestOrder.id} is ready for pickup. Please show this message to our staff.`;
        break;
      default:
        statusMessage = `Your order #${latestOrder.id} status is: ${status}`;
    }
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: statusMessage,
      sender: 'bot',
      timestamp: new Date(),
      type: 'order-status',
      status,
      order: latestOrder
    }]);
  };
  
  const handleCancelOrder = () => {
    if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "You don't have an active order to cancel.",
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    }
    
    setCurrentOrder([]);
    setShowCart(false);
    setShowCheckout(false);
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: "I've canceled your current order. Feel free to start over whenever you're ready!",
      sender: 'bot',
      timestamp: new Date()
    }]);
  };
  
  // Shopping Cart component
  const ShoppingCart = () => {
    if (currentOrder.length === 0) {
      return null;
    }
    
    return (
      <div className="fixed bottom-16 right-4 w-64 md:w-72 bg-white rounded-lg shadow-lg p-3 max-h-[60vh] overflow-y-auto z-10" style={{
        border: `1px solid ${colors.muted}`
      }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: colors.primary }}>Your Order</h3>
          <button 
            onClick={() => setShowCart(false)}
            className="text-xs p-1"
            style={{ color: colors.muted }}
          >
            Close
          </button>
        </div>
        
        <div className="space-y-2 mb-3">
          {currentOrder.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm p-1 border-b"
              style={{ borderColor: colors.muted + '50' }}>
              <div className="flex-1">
                <p style={{ color: colors.primary }}>{item.name} ({item.selectedSize})</p>
                <p style={{ color: colors.secondary }}>₱{item.price.toFixed(2)}</p>
              </div>
              
              <div className="flex items-center">
                <button 
                  onClick={() => updateOrderQuantity(item.id, -1)}
                  className="p-1 text-xs rounded-full"
                  style={{ backgroundColor: colors.muted + '20', color: colors.primary }}
                >
                  -
                </button>
                <span className="mx-1 text-xs" style={{ color: colors.primary }}>{item.quantity}</span>
                <button 
                  onClick={() => updateOrderQuantity(item.id, 1)}
                  className="p-1 text-xs rounded-full"
                  style={{ backgroundColor: colors.accent + '20', color: colors.primary }}
                >
                  +
                </button>
                <button 
                  onClick={() => removeFromOrder(item.id)}
                  className="ml-2 p-1 text-xs rounded-full"
                  style={{ backgroundColor: '#f8d7da', color: '#721c24' }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between font-bold text-sm mb-3" style={{ color: colors.primary }}>
          <span>Total:</span>
          <span>₱{calculateOrderTotal().toFixed(2)}</span>
        </div>
        
        <button
          onClick={handleCheckout}
          className="w-full py-2 text-sm rounded-full font-medium"
          style={{ backgroundColor: colors.accent, color: colors.background }}
        >
          Proceed to Checkout
        </button>
      </div>
    );
  };
  
  // Checkout form component
  const CheckoutForm = () => {
    if (!showCheckout) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-20">
        <div className="bg-white rounded-lg w-full max-w-md p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>Complete Your Order</h2>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.secondary }}>Your Name</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
                placeholder="Enter your name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.secondary }}>Phone Number</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
                placeholder="Enter your phone number"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.secondary }}>Table Number (if dining in)</label>
              <input
                type="text"
                value={customerInfo.tableNumber}
                onChange={(e) => setCustomerInfo({...customerInfo, tableNumber: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
                placeholder="Optional"
              />
            </div>
          </div>
          
          <div className="border-t pt-3 mb-3" style={{ borderColor: colors.muted }}>
            <h3 className="font-bold mb-2" style={{ color: colors.primary }}>Order Summary</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
              {currentOrder.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span style={{ color: colors.primary }}>
                    {item.quantity} × {item.name} ({item.selectedSize})
                  </span>
                  <span style={{ color: colors.secondary }}>
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold" style={{ color: colors.primary }}>
              <span>Total:</span>
              <span>₱{calculateOrderTotal().toFixed(2)}</span>
            </div>
            <div className="text-xs mt-1" style={{ color: colors.secondary }}>
              Estimated preparation time: {getEstimatedPrepTime()} minutes
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCheckout(false)}
              className="px-4 py-2 rounded border text-sm"
              style={{ borderColor: colors.muted, color: colors.primary }}
            >
              Cancel
            </button>
            <button
              onClick={handlePlaceOrder}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
  
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime.current;
    
    if (timeSinceLast < 1500) {
      const remaining = (1500 - timeSinceLast) / 1000;
      setRateLimitMessage(`Just a moment... (${remaining.toFixed(1)}s)`);
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        setRateLimitMessage('');
      }, 1500 - timeSinceLast);
      
      return;
    }
  
    lastRequestTime.current = now;
  
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
  
    const chatHistory = [...messages, userMessage]
      .slice(-5)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
  
    const input = userMessage.text.toLowerCase();

    // Order management commands
    if (input.includes('show') && (input.includes('cart') || input.includes('order'))) {
      handleShowCart();
      return;
    }

    if (input.includes('place order') || input.includes('checkout')) {
      handleCheckout();
      return;
    }

    if (input.includes("where") && input.includes("order")) {
      handleTrackOrder();
      return;
    }

    if ((input.includes("clear") || input.includes("cancel")) && input.includes("order")) {
      handleCancelOrder();
      return;
    }
  
    // Menu-related queries
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
  
    const aiText = await getAIResponse(userMessage.text, chatHistory);
    const botResponse = {
      id: Date.now(),
      text: aiText,
      sender: 'bot',
      timestamp: new Date()
    };
  
    setMessages(prev => [...prev, botResponse]);
    setIsTyping(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
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
                            onClick={() => handleOrderItem(item)}
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

                {message.type === 'order-confirmation' && (
                  <div className="mt-3 p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: colors.accent + '10',
                      borderColor: colors.accent + '30'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2 font-medium" style={{ color: colors.accent }}>
                      <FiCheckCircle />
                      <span>Order Confirmed!</span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: colors.primary }}>
                      Order #{message.order.id}
                    </p>
                    <div className="text-xs" style={{ color: colors.secondary }}>
                      <p>• {message.order.items.length} items</p>
                      <p>• Total: ₱{message.order.total.toFixed(2)}</p>
                      <p>• Estimated ready in {message.order.estimatedMinutes} mins</p>
                    </div>
                  </div>
                )}

                {message.type === 'order-status' && (
                  <div className="mt-3 p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: 
                        message.status === 'ready' 
                          ? '#d1e7dd' 
                          : message.status === 'preparing'
                            ? '#fff3cd'
                            : colors.muted + '20',
                      borderColor: 
                        message.status === 'ready' 
                          ? '#badbcc' 
                          : message.status === 'preparing'
                            ? '#ffecb5'
                            : colors.muted
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2 font-medium" 
                      style={{ 
                        color: message.status === 'ready' 
                          ? '#0f5132' 
                          : message.status === 'preparing'
                            ? '#856404'
                            : colors.primary
                      }}
                    >
                      {message.status === 'ready' ? <FiCheckCircle /> : <FiClock />}
                      <span>Order #{message.order.id}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" 
                          style={{ 
                            backgroundColor: message.status === 'ready' 
                              ? '#0f5132' 
                              : message.status === 'preparing'
                                ? '#856404'
                                : colors.accent
                          }}
                        ></div>
                        <span className="text-sm uppercase" 
                          style={{ 
                            color: message.status === 'ready' 
                              ? '#0f5132' 
                              : message.status === 'preparing'
                                ? '#856404'
                                : colors.primary
                          }}
                        >
                          {message.status}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: colors.secondary }}>
                        {new Date(message.order.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs space-y-1" style={{ color: colors.secondary }}>
                      {message.order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx}>• {item.quantity}× {item.name}</p>
                      ))}
                      {message.order.items.length > 2 && (
                        <p>• ...and {message.order.items.length - 2} more item(s)</p>
                      )}
                    </div>
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

      <ShoppingCart />
      <CheckoutForm />

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
            disabled={!inputMessage.trim() || isTyping}
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

      <style jsx>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
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