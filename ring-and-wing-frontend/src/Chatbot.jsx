import { useState, useRef, useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/solid';
import { FiShoppingCart, FiClock, FiCheckCircle, FiInfo, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import logo from './assets/rw.jpg';
import MenuItemImage from './components/MenuItemImage';
import { detectLanguage } from './utils/languagePatterns';
import { parseOrderText, findBestMenuItemMatch } from './utils/orderParser';
import { detectOrderIntentWithAI } from './utils/aiOrderDetection';

function ChatbotPage() {
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };
  
  // ID generation to prevent duplicate keys
  const generateUniqueId = () => {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Carousel scroll refs
  const carouselRefs = useRef({});

  const scrollCarousel = (messageId, direction) => {
    const carousel = carouselRefs.current[messageId];
    if (carousel) {
      const scrollAmount = 240; // Width of card + margin
      carousel.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Add dedicated carousel navigation functions with console logs for debugging
  const handleCarouselScroll = (messageId, direction) => {
    console.log(`Attempting to scroll carousel ${messageId} ${direction}`);
    const carousel = document.getElementById(`carousel-${messageId}`);
    if (carousel) {
      console.log("Found carousel element:", carousel);
      const scrollAmount = 220; // Width of card + margin
      const newScrollLeft = direction === 'left' 
        ? carousel.scrollLeft - scrollAmount 
        : carousel.scrollLeft + scrollAmount;
      
      console.log(`Scrolling from ${carousel.scrollLeft} to ${newScrollLeft}`);
      carousel.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    } else {
      console.log(`Carousel with ID carousel-${messageId} not found`);
    }
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
    }  ]);
    
  // Update welcome message when language changes
  useEffect(() => {
    // Only update if we have just the initial message
    if (messages.length === 1 && messages[0].id === 1) {
      // Always use English for the welcome message in the UI
      const welcomeMessage = "Hello! I'm the Ring & Wing Café assistant. How can I help you today?";
      
      setMessages([{
        id: 1,
        text: welcomeMessage,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const messagesEndRef = useRef(null);  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const lastRequestTime = useRef(Date.now());  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef(null);
  const [currentLanguage, setCurrentLanguage] = useState('english');
  const [pendingOrder, setPendingOrder] = useState(null);

  // Order management state variables
  const [currentOrder, setCurrentOrder] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    tableNumber: ''
  });  const [showCheckout, setShowCheckout] = useState(false);
  
  // State for tracking AI suggested items
  const [recentlySuggestedItems, setRecentlySuggestedItems] = useState([]);
  const [lastSuggestionTime, setLastSuggestionTime] = useState(null);
  
  const menuSuggestions = [
    { id: 1, text: "What's today's special?" },
    { id: 2, text: "What do you recommend?" },
    { id: 3, text: "Place an order" },
    { id: 4, text: "Where's my order?" },
    { id: 5, text: "Can i see the full menu?" }
  ];
  const tagalogSuggestions = [
    { id: 1, text: "Ano ang special ngayon?" },
    { id: 2, text: "Ano ang marerecommend mo?" },
    { id: 3, text: "Gusto kong umorder" },
    { id: 4, text: "Kumusta na yung order ko?" },
    { id: 5, text: "Pwede bang makita ang menu?" }
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
        console.log(`Successfully loaded ${items.length} menu items for chatbot`);
        
        // Validate that we have the menu data available for the chatbot
        if (items.length > 0) {
          const sampleMenu = getMenuContext().substring(0, 200) + '...';
          console.log('Sample menu context loaded:', sampleMenu);
        } else {
          console.error('No menu items loaded from the database!');
        }
      })
      .catch((err) => console.error("Error fetching menu items:", err));
      
    // Fetch revenue data for better recommendations
    fetch("http://localhost:5000/api/revenue/weekly")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRevenueData(data.data);
          console.log('Successfully loaded revenue data for recommendations');
        }
      })
      .catch((err) => console.error("Error fetching revenue data:", err));
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
  };  const sanitizeAIResponse = (text, userQuery = '') => {
    if (!text || text.trim().length < 2) {
      return "Let me check that for you...";
    }
  
    const sanitizedText = text.replace(/\*/g, '');
    const lowerText = sanitizedText.toLowerCase();
    const lowerUserQuery = userQuery.toLowerCase();
    
    // Detect language of the user query
    const userLanguage = detectLanguage(userQuery);
  
    const genericResponses = [
      "i can help with",
      "how can i assist",
      "what would you like to know about",
      "i'm an ai assistant"
    ];
  
    const isGeneric = genericResponses.some(phrase =>
      lowerText.includes(phrase)
    );
    
    // If the user is speaking in a non-English language but the AI response is in English,
    // we'll still send it through to preserve the model's output
    if (userLanguage !== 'english') {
      // Skip further customization to preserve the non-English response
      // Just sanitize asterisks and return
      return sanitizedText;
    }
  
    // Extract menu item names for better recognition
    const menuNames = menuData.map(item => item.name.toLowerCase());
    const mentionedItems = sanitizedText.split(/[\s.,]+/).filter(word =>
      menuNames.includes(word.toLowerCase())
    );
    
    // Categorize menu items by type for better contextual recommendations
    const coldDrinks = menuData.filter(item => 
      (item.category === 'Beverages' && 
      (item.subCategory === 'Cold Drinks' || 
       item.name.toLowerCase().includes('iced') || 
       item.name.toLowerCase().includes('cold') ||
       item.name.toLowerCase().includes('frappe') ||
       item.name.toLowerCase().includes('milkshake') ||
       item.name.toLowerCase().includes('milktea')))
    );
    
    const desserts = menuData.filter(item => 
      item.category === 'Desserts' || 
      item.name.toLowerCase().includes('cake') || 
      item.name.toLowerCase().includes('ice cream')
    );
    
    const lightMeals = menuData.filter(item => 
      (item.category === 'Food' && 
      (item.subCategory === 'Sandwiches' || 
       item.subCategory === 'Salads' || 
       item.name.toLowerCase().includes('wrap')))
    );

    // Weather-related queries
    if (
      lowerUserQuery.includes('hot') || 
      lowerUserQuery.includes('warm') || 
      lowerUserQuery.includes('heat') || 
      lowerUserQuery.includes('sunny')
    ) {
      // Get 2-3 cold drinks and a refreshing food item
      const recommendedDrinks = coldDrinks
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(3, coldDrinks.length));
        
      const drinkNames = recommendedDrinks.map(item => item.name);
      
      let responseText = `For this hot day, I'd recommend something refreshing! `;
      
      if (drinkNames.length > 0) {
        responseText += `Our ${drinkNames.join(', ')} would be perfect to cool you down. `;
      }
      
      if (desserts.length > 0) {
        const randomDessert = desserts[Math.floor(Math.random() * desserts.length)];
        responseText += `You might also enjoy our ${randomDessert.name} for a sweet treat.`;
      } else if (lightMeals.length > 0) {
        const randomMeal = lightMeals[Math.floor(Math.random() * lightMeals.length)];
        responseText += `Pair it with our ${randomMeal.name} for a light, refreshing meal.`;
      }
      
      return responseText;
    }
    
    // Cold weather related queries
    if (
      lowerUserQuery.includes('cold') || 
      lowerUserQuery.includes('chilly') || 
      lowerUserQuery.includes('rainy') ||
      lowerUserQuery.includes('rain')
    ) {
      // Get hot drinks and comfort food
      const hotDrinks = menuData.filter(item => 
        (item.category === 'Beverages' && 
        (item.subCategory === 'Hot Drinks' || 
         item.subCategory === 'Coffee' ||
         item.name.toLowerCase().includes('hot') ||
         item.name.toLowerCase().includes('tea') && !item.name.toLowerCase().includes('iced')))
      );
      
      const comfortFood = menuData.filter(item => 
        item.category === 'Food' && 
        (item.name.toLowerCase().includes('soup') || 
         item.name.toLowerCase().includes('stew') ||
         item.name.toLowerCase().includes('pasta') ||
         item.subCategory === 'Main Dishes')
      );
      
      const drinkOptions = hotDrinks
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(2, hotDrinks.length))
        .map(item => item.name);
        
      const foodOptions = comfortFood
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(2, comfortFood.length))
        .map(item => item.name);
      
      let responseText = `For this cold weather, I'd suggest something warming! `;
      
      if (drinkOptions.length > 0) {
        responseText += `Our ${drinkOptions.join(' or ')} would warm you right up. `;
      }
      
      if (foodOptions.length > 0) {
        responseText += `It pairs perfectly with our ${foodOptions.join(' or ')} for a comforting meal.`;
      }
      
      return responseText;
    }
    
    // Handle time-of-day related queries
    if (lowerUserQuery.includes('breakfast') || lowerUserQuery.includes('morning')) {
      const breakfastItems = menuData.filter(item => 
        item.subCategory === 'Breakfast' || 
        item.name.toLowerCase().includes('breakfast') ||
        item.name.toLowerCase().includes('egg') ||
        item.name.toLowerCase().includes('bacon') ||
        item.name.toLowerCase().includes('toast')
      );
      
      const morningDrinks = menuData.filter(item => 
        item.category === 'Beverages' && 
        (item.subCategory === 'Coffee' || 
         item.name.toLowerCase().includes('juice') ||
         item.name.toLowerCase().includes('tea'))
      );
      
      if (breakfastItems.length > 0 || morningDrinks.length > 0) {
        const foodRecs = breakfastItems
          .slice(0, Math.min(2, breakfastItems.length))
          .map(item => item.name);
          
        const drinkRecs = morningDrinks
          .slice(0, Math.min(2, morningDrinks.length))
          .map(item => item.name);
        
        let responseText = `For a delicious morning meal, `;
        
        if (foodRecs.length > 0) {
          responseText += `I recommend our ${foodRecs.join(' or ')}. `;
        }
        
        if (drinkRecs.length > 0) {
          responseText += `Pair it with a refreshing ${drinkRecs.join(' or ')} to start your day right!`;
        }
        
        return responseText;
      }
    }

    // Handle special items
    if (isGeneric && lowerText.includes('special')) {
      const special = menuData.find(item => item.isSpecial) || menuData[0];
      return `Today's special is ${special.name} - ${special.description}. It's a customer favorite and I highly recommend it!`;
    }
  
    // Enhanced personalized recommendations 
    if ((mentionedItems.length === 0 && (lowerUserQuery.includes('recommend') || lowerUserQuery.includes('suggest'))) || 
        lowerUserQuery.includes('popular') || 
        lowerUserQuery.includes('best seller') ||
        lowerUserQuery.includes('bestseller')) {
      
      // If we have revenue data, use it for personalized recommendations
      if (revenueData?.topItems?.length > 0) {
        const topSellers = revenueData.topItems.slice(0, 3);
        
        // Build a more personalized and engaging response
        let responseText = `Based on what our customers love most, I'd recommend: `;
        
        topSellers.forEach((item, index) => {
          responseText += `${item.name}`;
          
          // Add a brief descriptor if possible
          const menuItem = menuData.find(mi => mi.name === item.name);
          if (menuItem && menuItem.description) {
            const shortDesc = menuItem.description.split('.')[0]; // Just first sentence
            responseText += ` (${shortDesc})`;
          }
          
          if (index < topSellers.length - 2) {
            responseText += `, `;
          } else if (index === topSellers.length - 2) {
            responseText += ` and `;
          }
        });
        
        responseText += `. Would you like to try any of these today?`;
        return responseText;
      } else {
        // Fall back to curated recommendations if no revenue data
        const categories = [...new Set(menuData.map(item => item.category))];
        let responseText = `I'd be happy to recommend some of our most popular items! `;
        
        // Try to recommend one item from each main category
        const recommendations = [];
        
        for (const category of categories) {
          const itemsInCategory = menuData.filter(item => item.category === category);
          if (itemsInCategory.length > 0) {
            const randomItem = itemsInCategory[Math.floor(Math.random() * itemsInCategory.length)];
            recommendations.push({
              name: randomItem.name,
              category: category
            });
            
            if (recommendations.length >= 3) break;
          }
        }
        
        if (recommendations.length > 0) {
          responseText += `From our menu, I suggest trying: `;
          recommendations.forEach((rec, index) => {
            responseText += `${rec.name} from our ${rec.category} selection`;
            if (index < recommendations.length - 2) {
              responseText += `, `;
            } else if (index === recommendations.length - 2) {
              responseText += ` and `;
            }
          });
          responseText += `. These are customer favorites!`;
        } else {
          // Absolute fallback
          const popularItems = menuData.slice(0, 3).map(i => i.name);
          responseText += `Some great choices would be: ${popularItems.join(', ')}.`;
        }
        
        return responseText;
      }
    }
    
    // Check for specific dietary preferences
    if (
      lowerUserQuery.includes('vegetarian') || 
      lowerUserQuery.includes('vegan') ||
      lowerUserQuery.includes('gluten free') ||
      lowerUserQuery.includes('gluten-free') ||
      lowerUserQuery.includes('healthy')
    ) {
      // Extract the dietary preference
      let dietaryType = '';
      if (lowerUserQuery.includes('vegetarian')) dietaryType = 'vegetarian';
      else if (lowerUserQuery.includes('vegan')) dietaryType = 'vegan';
      else if (lowerUserQuery.includes('gluten')) dietaryType = 'gluten-free';
      else dietaryType = 'healthy';
      
      // Filter menu for these items - this is simplified and would need proper tagging in the database
      const dietaryItems = menuData.filter(item => 
        (item.tags && item.tags.includes(dietaryType)) ||
        (item.description && item.description.toLowerCase().includes(dietaryType)) ||
        (dietaryType === 'healthy' && 
         (item.category === 'Salads' || 
          (item.description && (
            item.description.toLowerCase().includes('fresh') ||
            item.description.toLowerCase().includes('healthy') ||
            item.description.toLowerCase().includes('nutritious')
          ))))
      );
      
      if (dietaryItems.length > 0) {
        const recommendations = dietaryItems
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(3, dietaryItems.length))
          .map(item => item.name);
          
        return `For ${dietaryType} options, I recommend: ${recommendations.join(', ')}. Would you like to know more about any of these items?`;
      }
    }
    // If we couldn't create a more personalized response, return the sanitized text
    return sanitizedText;
  };
  
  // Using the imported detectLanguage function from languagePatterns.js
    // Generate AI description for a menu item
  const generateMenuItemDescription = async (itemName, basicDescription, language = 'english') => {    // Customize instructions based on language
    let languageInstructions = '';
    let wordCountRange = '';      if (language === 'tagalog') {
      languageInstructions = 'Write the description in natural Taglish (mixed Tagalog/English). Use a 60% Tagalog, 40% English mix that feels authentic. Keep menu item names in English but describe them in Taglish. Use a casual, friendly tone like talking to a friend - avoid formal terms like "po" and "opo".';
      wordCountRange = 'Keep descriptions between 25-45 words';
    } else {
      languageInstructions = 'Write the description in English.';
      wordCountRange = 'Keep descriptions between 20-40 words';
    }
    
    const systemMessage = {
      role: "system",
      content: `You are a professional food writer who creates appetizing, appealing food descriptions for cafe menus.
- ${wordCountRange}
- Highlight flavors, textures, and key ingredients
- Use vivid, sensory language that makes the dish sound delicious
- Focus on what makes this item special
- Be authentic and accurate to the actual food described
- Never use markdown or special formatting
- ${languageInstructions}`
    };
    
    const userPrompt = `Create a short, appealing menu description for "${itemName}" based on this basic description: "${basicDescription}"`;
    
    const payload = {
      model: "gemini-1.5-flash",
      messages: [
        systemMessage,
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 100
    };
    
    try {
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
      
      if (data.error || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Error generating menu description:", data.error || "Invalid response format");
        return basicDescription;
      }
      
      const description = data.choices[0].message.content.trim();
      console.log('Generated menu description:', description);
      
      return description;
    } catch (error) {
      console.error("Error generating menu description:", error);
      return basicDescription;
    }
  };
  // Updated AI response function with proxy implementation
  const getAIResponse = async (userInput, chatHistory = []) => {
    // Detect the language of the user input
    const detectedLanguage = detectLanguage(userInput);
    console.log('Detected language:', detectedLanguage);
    
    // Create popular items list from revenue data if available
    let popularItemsInfo = '';
    if (revenueData?.topItems?.length > 0) {
      const topSellers = revenueData.topItems.slice(0, 3).map(item => 
        `${item.name} (${item.quantity} sold, ₱${Math.round(item.revenue)} revenue)`
      );
      popularItemsInfo = `\n\nOur current best-selling items are: ${topSellers.join(', ')}.`;
    }    // Language-specific instructions
    let languageInstructions = '';    if (detectedLanguage === 'tagalog') {      languageInstructions = `
6. Language preferences:
   - Respond with natural Taglish (mixed Tagalog and English)
   - CRITICAL: Never acknowledge or mention language changes - continue conversation naturally
   - Use a 60% Tagalog, 40% English mix that sounds authentic and conversational 
   - Mix languages mid-sentence as Filipinos naturally do in everyday speech
   - Keep tone casual and friendly - like talking to a friend or colleague
   - Use Tagalog for conversational phrases, but keep menu items in English
   - Examples of natural Taglish:
     * "Ang bestseller namin is yung Caramel Macchiato. Gusto mo bang i-try?"
     * "Masarap din yung Signature Blend Coffee namin with our Chocolate Cake."
     * "Available pa rin yung seasonal drinks namin hanggang next week."
   - Avoid using formal terms like "po" and "opo" to maintain a friendly atmosphere   - Keep monetary values as: "₱99"
   - DO NOT say things like "Oh, you're speaking Tagalog!" or anything that acknowledges the language`;
    } else {
      languageInstructions = `
6. Language preferences:
   - Respond in English by default
   - If the customer switches to another language, switch seamlessly without any acknowledgment
   - For Tagalog, use natural Taglish (mixed Tagalog-English) as it's more authentic
   - CRITICAL: Never comment on language changes in your response - maintain conversational flow`;
    }
    
    const systemMessage = {
      role: "system",      
      content: `You are Ring & Wing Café's helpful, friendly, and attentive assistant. Here are your guidelines:

1. Available menu items (only talk about these actual items):
${getMenuContext()}

2. Conversation style:
   - Be warm, personable, and sound like a knowledgeable café staff member
   - Keep responses friendly, professional, and concise (2-3 sentences max)
   - Use a conversational tone that's engaging but not overly casual
   - Add character with occasional café-appropriate expressions like "Absolutely!" or "Perfect choice!"

3. Contextual awareness:
   - For weather-related queries (hot/cold days), recommend appropriate items
   - For time-of-day queries, suggest fitting menu items (breakfast/lunch/dinner)
   - Consider dietary needs when mentioned (vegetarian/vegan/gluten-free)

4. Formatting and content rules:
   - Do not use asterisks or markdown formatting
   - Never mention competitor restaurants or cafes
   - Format prices as: "Small: ₱99 | Medium: ₱120"
   - If asked about unavailable items, say: "I'm sorry, that item isn't available. Would you like me to suggest something similar from our menu?"

5. Recommendations:
   - Always recommend specific items from our actual menu
   - If suggesting multiple items, recommend complementary pairings (drink + food)
   - Highlight special features or ingredients when relevant

${languageInstructions}

${popularItemsInfo}`
    };
      const payload = {
      model: "gemini-1.5-flash", // Using the 1.5 model which has better performance
      messages: [
        systemMessage,
        ...chatHistory,
        { role: "user", content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 800
    };
    
    try {
      // Using proxy endpoint that now connects to Gemini API
      console.log('Sending chat request with payload:', {
        model: payload.model,
        messageCount: payload.messages.length,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens
      });
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.error(`API error: Status ${res.status}`);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`API error: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Chat API response:', data);
        // Check if there's an error in the response
      if (data.error) {
        console.error("Gemini API error:", data.error);
        return "Sorry, I'm having trouble answering that question. Could you try rephrasing?";
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Invalid response format from API:", data);
        return "Sorry, I received an invalid response format. Please try again.";
      }
        
      let aiText = data.choices[0].message.content;
      console.log('Raw AI response:', aiText);
      
      // For non-English queries, preserve the response as is to maintain the language integrity
      if (detectedLanguage !== 'english') {
        console.log(`Preserving ${detectedLanguage} response without extra sanitization`);
        // Remove asterisks but preserve the original language response
        return aiText.replace(/\*/g, '');
      }
      
      // For English responses, apply fuller sanitization
      aiText = sanitizeAIResponse(aiText, userInput);
      console.log('Sanitized AI response:', aiText);
      
      return aiText;
    } catch (error) {
      console.error("Error with AI service:", error);
      return "Sorry, I'm having trouble connecting to the AI service. Please try again in a moment.";
    }
  };
  // Order management functions
  const addToCurrentOrder = (item, size = 'base', quantity = 1) => {
    // Ensure item object is complete
    if (!item) {
      console.error("Cannot add undefined item to order");
      return;
    }

    const existingItemIndex = currentOrder.findIndex(
      orderItem => orderItem.name === item.name && orderItem.selectedSize === size
    );

    if (existingItemIndex !== -1) {
      // Update quantity if item already in order
      const updatedOrder = [...currentOrder];
      updatedOrder[existingItemIndex].quantity += quantity;
      setCurrentOrder(updatedOrder);
      setShowCart(true); // Ensure cart is visible when adding items
    } else {
      // Add new item to order
      const sizePrice = item.pricing && item.pricing[size] 
        ? item.pricing[size] 
        : (item.pricing && Object.values(item.pricing)[0]) || 0;
          setCurrentOrder([
        ...currentOrder,
        {
          id: generateUniqueId(),
          name: item.name,
          selectedSize: size,
          price: sizePrice,
          quantity: quantity,
          image: item.image || ""
        }
      ]);
      setShowCart(true); // Ensure cart is visible when adding items
    }
  };
    // Get multilingual response text based on language detection
    const getLocalizedText = (key, language = 'english') => {    
      const localizedStrings = {      orderAdded: {
        english: "I've started an order for you. You can say 'show my cart' anytime to see your current order.",
        tagalog: "Na-start ko na yung order mo. Sabihin mo lang 'show my cart' kung gusto mong makita yung order mo anytime."
      },      noItemsInCart: {
        english: "You don't have any items in your order yet. Would you like to see our menu?",
        tagalog: "Wala ka pang items sa cart mo. Gusto mo bang makita yung menu namin?"
      },      itemsInCart: {
        english: (count) => `You have ${count} item${count > 1 ? 's' : ''} in your order. You can view your cart below.`,
        tagalog: (count) => `May ${count} item${count > 1 ? 's' : ''} ka sa cart mo. Nasa baba yung order mo para ma-check mo.`
      },      checkoutDetails: {
        english: "Great! I'll need a few details to process your order.",
        tagalog: "Perfect! Kailangan ko lang ng konting details para ma-process natin yung order mo."
      },      orderCancelled: {
        english: "I've canceled your current order. Feel free to start over whenever you're ready!",
        tagalog: "Na-cancel ko na yung order mo. Just start over nalang kapag ready ka na ulit!"
      },      noOrderToCancel: {
        english: "You don't have an active order to cancel.",
        tagalog: "Wala ka pang active order na pwedeng i-cancel."
      },      itemAdded: {
        english: (name) => `Added ${name} to your order. Would you like anything else?`,
        tagalog: (name) => `Na-add ko na yung ${name} sa order mo. May gusto ka pa bang iba?`
      }
    };
    
    return localizedStrings[key][language] || localizedStrings[key]['english'];
  };
    const addMessageToCart = (userMessage) => {
    // Show cart message if this is the first item
    if (currentOrder.length === 0) {
      // Detect language from user input or use English as default
      const detectedLang = userMessage?.text ? detectLanguage(userMessage.text) : 'english';
        setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: getLocalizedText('orderAdded', detectedLang),
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }

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
  };  const handleOrderItem = (item) => {
    if (!item || !item.name) {
      console.error("Attempted to order an invalid item:", item);
      return;
    }
    
    // Get first available size or default to 'base'
    const size = item.pricing && Object.keys(item.pricing).length > 0 
      ? Object.keys(item.pricing)[0] 
      : 'base';
    
    // Find the matching menu item with full data
    const menuItem = menuData.find(menuItem => menuItem.name === item.name) || item;
    
    // Add to order
    addToCurrentOrder(menuItem, size);
    
    // Create a user message about ordering this item
    const userMessage = {
      id: generateUniqueId(),
      text: `I'd like to order ${item.name}`,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Detect language from the user message
    const detectedLang = detectLanguage(userMessage.text);    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: getLocalizedText('itemAdded', detectedLang)(item.name),
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
    
    // Detect language from the last user message if available
    const lastUserMsg = messages.filter(m => m.sender === 'user').pop();
    const detectedLang = lastUserMsg ? detectLanguage(lastUserMsg.text) : 'english';
      if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: getLocalizedText('noItemsInCart', detectedLang),
        sender: 'bot',
        timestamp: new Date()
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: getLocalizedText('itemsInCart', detectedLang)(currentOrder.length),
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  };
    const handleCheckout = () => {
    // Detect language from the last user message if available
    const lastUserMsg = messages.filter(m => m.sender === 'user').pop();
    const detectedLang = lastUserMsg ? detectLanguage(lastUserMsg.text) : 'english';
      if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: getLocalizedText('noItemsInCart', detectedLang),
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    }

    setShowCheckout(true);
    
    setMessages(prev => [...prev, {
      id: generateUniqueId(),
      text: getLocalizedText('checkoutDetails', detectedLang),
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
      id: generateUniqueId(),
      text: `Thank you for your order! Your order #${orderNumber} has been placed successfully. Please proceed to the counter for payment. After payment, your order should be ready in approximately ${estimatedTime} minutes. You can ask "Where's my order?" anytime to check the status.`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'order-confirmation',
      order: order
    }]);
  };
  
  const handleTrackOrder = () => {    if (orderHistory.length === 0) {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
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
      id: generateUniqueId(),
      text: statusMessage,
      sender: 'bot',
      timestamp: new Date(),
      type: 'order-status',
      status,
      order: latestOrder
    }]);
  };
  const handleCancelOrder = () => {
    // Detect language from the last user message if available
    const lastUserMsg = messages.filter(m => m.sender === 'user').pop();
    const detectedLang = lastUserMsg ? detectLanguage(lastUserMsg.text) : 'english';
      if (currentOrder.length === 0) {
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: getLocalizedText('noOrderToCancel', detectedLang),
        sender: 'bot',
        timestamp: new Date()
      }]);
      return;
    }
    
    setCurrentOrder([]);
    setShowCart(false);
    setShowCheckout(false);
    
    setMessages(prev => [...prev, {
      id: generateUniqueId(),
      text: getLocalizedText('orderCancelled', detectedLang),
      sender: 'bot',
      timestamp: new Date()
    }]);
  };
    // Shopping Cart component
  const ShoppingCart = () => {
    // Don't render if cart is not visible or empty
    if (!showCart || currentOrder.length === 0) {
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
    // Localized form labels and buttons
  const formStrings = {
    english: {
      completeOrder: "Complete Your Order",
      yourName: "Your Name",
      phoneNumber: "Phone Number",
      tableNumber: "Table Number (if dining in)",
      orderSummary: "Order Summary",
      estimatedTime: "Estimated preparation time",
      minutes: "minutes",
      cancel: "Cancel",
      placeOrder: "Place Order",
      namePlaceholder: "Enter your name",
      phonePlaceholder: "Enter your phone number",
      tablePlaceholder: "Optional"
    },
    tagalog: {
      completeOrder: "Complete Your Order",
      yourName: "Name mo",
      phoneNumber: "Phone Number mo",
      tableNumber: "Table Number (kung dine-in ka)",
      orderSummary: "Order Summary",
      estimatedTime: "Estimated preparation time",
      minutes: "minutes",
      cancel: "Cancel",
      placeOrder: "Place Order",      namePlaceholder: "Enter your name",
      phonePlaceholder: "Enter your phone number",
      tablePlaceholder: "Optional"
    }
  };
    // Checkout form component
  const CheckoutForm = () => {
    if (!showCheckout) return null;
    
    // Detect language from the last user message
    const lastUserMsg = messages.filter(m => m.sender === 'user').pop();
    const detectedLang = lastUserMsg ? detectLanguage(lastUserMsg.text) : 'english';
    
    const labels = formStrings[detectedLang] || formStrings.english;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-20">
        <div className="bg-white rounded-lg w-full max-w-md p-4">
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>{labels.completeOrder}</h2>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.secondary }}>{labels.yourName}</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
                placeholder={labels.namePlaceholder}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.secondary }}>{labels.phoneNumber}</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
                placeholder={labels.phonePlaceholder}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.secondary }}>{labels.tableNumber}</label>
              <input
                type="text"
                value={customerInfo.tableNumber}
                onChange={(e) => setCustomerInfo({...customerInfo, tableNumber: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
                placeholder={labels.tablePlaceholder}
              />
            </div>
          </div>
          
          <div className="border-t pt-3 mb-3" style={{ borderColor: colors.muted }}>
            <h3 className="font-bold mb-2" style={{ color: colors.primary }}>{labels.orderSummary}</h3>
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
              {labels.estimatedTime}: {getEstimatedPrepTime()} {labels.minutes}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCheckout(false)}
              className="px-4 py-2 rounded border text-sm"
              style={{ borderColor: colors.muted, color: colors.primary }}
            >
              {labels.cancel}
            </button>
            <button
              onClick={handlePlaceOrder}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              {labels.placeOrder}
            </button>
          </div>
        </div>
      </div>    );
  };

  // Enhanced order detection function for AI suggestions
  const detectOrderFromSuggestion = (input) => {
    if (!recentlySuggestedItems.length) return null;
    
    // Clear suggestions older than 5 minutes
    if (lastSuggestionTime && (Date.now() - lastSuggestionTime > 300000)) {
      setRecentlySuggestedItems([]);
      return null;
    }
    
    const lowerInput = input.trim().toLowerCase();    // Enhanced confirmation patterns including pricing queries
    const confirmationPatterns = [
      /(?:i'?ll\s+)?(?:take|get|want|have|order|need|give\s+me)\s+(?:that|those|it|them)/i,
      /(?:yes|yeah|yep|sure|okay|ok|alright),?\s*(?:i'?ll\s+)?(?:take|get|want|have|order|need|give\s+me)?/i,
      /(?:i\s+)?(?:want|need|like)\s+(?:that|those|it|them)/i,
      /(?:add|put)\s+(?:that|those|it|them)\s+(?:to\s+)?(?:my\s+)?(?:order|cart)/i,
      /(?:the\s+)?(?:first|second|third|1st|2nd|3rd|\d+(?:st|nd|rd|th)?)\s+(?:one|item|option)/i,
      /(?:number|#)\s*(\d+)/i,
      /(?:\d+\s+)?(?:of\s+)?(?:that|those|it|them)/i
    ];
    
    // Pricing inquiry patterns - these should return price info, not add to cart
    const pricingPatterns = [
      /(?:how\s+much|what'?s\s+the\s+price|price|cost)\s+(?:for|of)?\s*(?:\d+\s+)?(?:of\s+)?(?:that|those|it|them)/i,
      /(?:how\s+much)\s+(?:is|are|would|will|does|do)\s*(?:\d+\s+)?(?:of\s+)?(?:that|those|it|them)/i,
      /(?:what\s+does)\s*(?:\d+\s+)?(?:of\s+)?(?:that|those|it|them)\s+cost/i
    ];
      const isConfirmation = confirmationPatterns.some(pattern => pattern.test(lowerInput));
    const isPricingQuery = pricingPatterns.some(pattern => pattern.test(lowerInput));
    
    if (!isConfirmation && !isPricingQuery) return null;
    
    // Extract quantity
    const quantityWords = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    
    let quantity = 1;
    const quantityMatch = lowerInput.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
    if (quantityMatch) {
      const matched = quantityMatch[1].toLowerCase();
      quantity = quantityWords[matched] || parseInt(matched) || 1;
    }
    
    // Extract size
    const sizeMatch = lowerInput.match(/(small|medium|large|regular)/i);
    const size = sizeMatch ? sizeMatch[1].toLowerCase() : null;
    
    // Determine which item was referenced
    let selectedItem = null;
    
    // Check for specific item number/position
    const itemNumberMatch = lowerInput.match(/(?:the\s+)?(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|\d+(?:st|nd|rd|th)?)/i);
    if (itemNumberMatch) {
      let itemIndex = 0;
      const match = itemNumberMatch[0].toLowerCase();
      
      if (match.includes('first') || match.includes('1st')) itemIndex = 0;
      else if (match.includes('second') || match.includes('2nd')) itemIndex = 1;
      else if (match.includes('third') || match.includes('3rd')) itemIndex = 2;
      else if (match.includes('fourth') || match.includes('4th')) itemIndex = 3;
      else if (match.includes('fifth') || match.includes('5th')) itemIndex = 4;
      else {
        const num = parseInt(match.match(/\d+/)?.[0]);
        if (num) itemIndex = num - 1;
      }
      
      if (itemIndex >= 0 && itemIndex < recentlySuggestedItems.length) {
        selectedItem = recentlySuggestedItems[itemIndex];
      }
    }
    
    // If no specific item mentioned and only one suggestion, use it
    if (!selectedItem && recentlySuggestedItems.length === 1) {
      selectedItem = recentlySuggestedItems[0];
    }
    
    // If multiple items and no specific selection, ask for clarification
    if (!selectedItem && recentlySuggestedItems.length > 1) {
      return {
        type: 'clarification',
        message: "Which item would you like? Please specify by number (e.g., 'the first one' or 'number 2')."
      };
    }
      if (selectedItem) {
      // Get the menu item to determine available sizes and pricing
      const menuItem = selectedItem.fullItem || menuData.find(item => item.name === selectedItem.name);
      
      if (menuItem && menuItem.pricing) {
        const availableSizes = Object.keys(menuItem.pricing);
        let finalSize = size;
        
        // If no size specified, default to first available size
        if (!finalSize && availableSizes.length > 0) {
          finalSize = availableSizes[0];
        }
        
        // Validate size exists, if not use first available
        if (!availableSizes.includes(finalSize)) {
          finalSize = availableSizes[0];
        }
          return {
          type: isPricingQuery ? 'pricing' : 'order',
          item: menuItem,
          itemName: selectedItem.name,
          quantity: quantity,
          size: finalSize,
          availableSizes: availableSizes,
          pricing: menuItem.pricing
        };
      }
    }
    
    return null;
  };  const handleSendMessage = async (e) => {
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

    // Detect language and update current language state
    const detectedLang = detectLanguage(inputMessage);
    if (detectedLang !== currentLanguage) {
      console.log(`Language changed from ${currentLanguage} to ${detectedLang}`);
      setCurrentLanguage(detectedLang);
    }
    const userMessage = {
      id: generateUniqueId(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Use only the last few messages in the chat history to avoid
    // exceeding context limits, but ensure we keep the menu context
    const chatHistory = [...messages, userMessage]
      .slice(-5)
      .filter(msg => msg.sender === 'user' || msg.sender === 'bot')
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

    const input = userMessage.text.toLowerCase();
    let staticResponseSent = false;

    // Use AI to detect order intent instead of regex patterns
    try {
      const orderIntentResult = await detectOrderIntentWithAI(
        userMessage.text,
        menuData,
        chatHistory,
        detectedLang
      );

      if (orderIntentResult.hasOrderIntent && orderIntentResult.items?.length > 0) {
        // Handle high confidence orders directly
        const highConfidenceItems = orderIntentResult.items.filter(
          item => item.confidence === 'high'
        );

        if (highConfidenceItems.length > 0) {
          // Add items to order with original logic
          for (const match of highConfidenceItems) {
            const { menuItem, quantity, size } = match;
            addToCurrentOrder(menuItem, size, quantity);
          }

          addMessageToCart(userMessage);

          const itemDescriptions = highConfidenceItems.map(match =>
            `${match.quantity} ${match.menuItem.name} (${match.size})`
          );

          setMessages(prev => [...prev, {
            id: generateUniqueId(),
            text: `Added ${itemDescriptions.join(", ")} to your order. Would you like anything else?`,
            sender: 'bot',
            timestamp: new Date()
          }]);

          setIsTyping(false);
          staticResponseSent = true;
        }
        // For medium/low confidence, ask for confirmation
        else if (orderIntentResult.items.length > 0) { // Ensure there are items before asking for confirmation
          setPendingOrder(orderIntentResult.items);

          const confirmationItems = orderIntentResult.items.map(match =>
            `${match.quantity} × ${match.menuItem.name} (${match.size})`
          ).join("\\n");

          setMessages(prev => [...prev, {
            id: generateUniqueId(),
            text: `I think you want to order:\\n${confirmationItems}\\n\\nIs that correct? Please confirm.`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'order-confirmation-request'
          }]);

          setIsTyping(false);
          staticResponseSent = true;
        }
      }    } catch (error) {
      console.error("Error in AI order detection:", error);
      // Continue with other message handling if AI detection fails
    }

    // Check for order confirmations from AI suggestions
    if (!staticResponseSent && recentlySuggestedItems.length > 0) {
      const suggestionOrder = detectOrderFromSuggestion(input);
      
      if (suggestionOrder) {
        if (suggestionOrder.type === 'clarification') {
          setMessages(prev => [...prev, {
            id: generateUniqueId(),
            text: suggestionOrder.message,
            sender: 'bot',
            timestamp: new Date()
          }]);
          setIsTyping(false);
          staticResponseSent = true;        } else if (suggestionOrder.type === 'pricing') {
          const { item, itemName, quantity, availableSizes } = suggestionOrder;
          
          if (availableSizes.length > 1) {
            // Multiple sizes available - show pricing for each
            const sizeOptions = availableSizes.map(s => `${s}: ₱${item.pricing[s]}`).join(', ');
            const totalForEach = availableSizes.map(s => `${quantity} ${s}: ₱${item.pricing[s] * quantity}`).join(', ');
            
            setMessages(prev => [...prev, {
              id: generateUniqueId(),
              text: `Our ${itemName} pricing: ${sizeOptions}. For ${quantity} pieces: ${totalForEach}. Which size would you like?`,
              sender: 'bot',
              timestamp: new Date()
            }]);
          } else {
            // Single size available
            const size = availableSizes[0];
            const unitPrice = item.pricing[size];
            const totalPrice = unitPrice * quantity;
            
            setMessages(prev => [...prev, {
              id: generateUniqueId(),
              text: `${quantity} ${itemName} would be ₱${totalPrice} (₱${unitPrice} each). Would you like to add this to your order?`,
              sender: 'bot',
              timestamp: new Date()
            }]);
          }
          
          setIsTyping(false);
          staticResponseSent = true;
        } else if (suggestionOrder.type === 'order') {
          const { item, itemName, quantity, size } = suggestionOrder;
          
          // Determine the appropriate size and pricing
          let finalSize = size;
          let finalPrice = 0;
          let availableSizes = [];
          
          if (item && item.pricing) {
            availableSizes = Object.keys(item.pricing);
            
            // If no size specified but user asked about pricing, show available sizes
            if (!finalSize && availableSizes.length > 1) {
              const sizeOptions = availableSizes.map(s => `${s} (₱${item.pricing[s]})`).join(', ');
              setMessages(prev => [...prev, {
                id: generateUniqueId(),
                text: `Our ${itemName} comes in: ${sizeOptions}. Which size would you prefer?`,
                sender: 'bot',
                timestamp: new Date()
              }]);
              setIsTyping(false);
              staticResponseSent = true;
              return;
            }
            
            // If no size specified and only one size available, use it
            if (!finalSize) {
              finalSize = availableSizes[0];
            }
            
            // Validate size exists
            if (!availableSizes.includes(finalSize)) {
              finalSize = availableSizes[0];
            }
            
            finalPrice = item.pricing[finalSize];
          }
          
          // Add to order using your existing function
          if (typeof addToCurrentOrder === 'function') {
            addToCurrentOrder(item, finalSize, quantity);
          }
          
          const totalPrice = finalPrice * quantity;
          const sizeText = finalSize && finalSize !== 'base' && availableSizes.length > 1 ? ` ${finalSize}` : '';
          
          setMessages(prev => [...prev, {
            id: generateUniqueId(),
            text: `Perfect! I've added ${quantity}${sizeText} ${itemName} to your order. That's ₱${totalPrice}. Would you like anything else?`,
            sender: 'bot',
            timestamp: new Date()
          }]);
          
          // Clear suggestions after successful order
          setRecentlySuggestedItems([]);
          setIsTyping(false);
          staticResponseSent = true;
        }
      }
    }

    // Order management commands
    if (input.includes('show') && (input.includes('cart') || input.includes('order'))) {
      handleShowCart();
      staticResponseSent = true;
    }
    else if (input.includes('place order') || input.includes('checkout')) {
      handleCheckout();
      staticResponseSent = true;
    }
    else if (input.includes("where") && input.includes("order")) {
      handleTrackOrder();
      staticResponseSent = true;
    }
    else if ((input.includes("clear") || input.includes("cancel")) && input.includes("order")) {
      handleCancelOrder();
      staticResponseSent = true;
    }
    // Handle order confirmation
    else if (pendingOrder && pendingOrder.length > 0) {
      // Check for confirmation responses
      const affirmativeResponses = ['yes', 'yeah', 'yep', 'correct', 'right', 'sure', 'ok', 'okay', 'confirm'];
      const negativeResponses = ['no', 'nope', 'wrong', 'incorrect', 'cancel'];
      
      const isAffirmative = affirmativeResponses.some(resp => input.includes(resp));
      const isNegative = negativeResponses.some(resp => input.includes(resp));
      
      if (isAffirmative) {
        handleOrderConfirmation(true);
        staticResponseSent = true;
      } else if (isNegative) {
        handleOrderConfirmation(false);
        staticResponseSent = true;
      }
    }
    // Menu-related queries
    else if (input.includes('menu')) {      const aiText = await getAIResponse(userMessage.text, chatHistory);
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: aiText,
        sender: 'bot',
        timestamp: new Date()
      }]);
  
      const menuMessage = {
        id: generateUniqueId(),
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
      staticResponseSent = true;
    }
    else if (input.includes('coffee')) {
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
        }));      if (coffeeItems.length === 0) {
        setMessages(prev => [...prev, {
          id: generateUniqueId(),
          text: "We currently don't have coffee items available. Please check back later!",
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        staticResponseSent = true;
      } else {
        const aiText = await getAIResponse(userMessage.text, chatHistory);
        setMessages(prev => [
          ...prev,
          {
            id: generateUniqueId(),
            text: aiText,
            sender: 'bot',
            timestamp: new Date()
          },
          {
            id: generateUniqueId(),
            text: "",
            sender: 'bot',
            type: 'menu-items',
            items: coffeeItems,
            timestamp: new Date()
          }
        ]);
        setIsTyping(false);
        staticResponseSent = true;
      }
    }    // Only get AI response if no static response was sent
    if (!staticResponseSent) {
      try {
        // Process contextual keywords to help guide the AI response
        let enhancedInput = userMessage.text;
        
        // Check for time-of-day related context
        const currentHour = new Date().getHours();
        if (currentHour >= 6 && currentHour < 11 && 
            !enhancedInput.toLowerCase().includes('breakfast') && 
            !enhancedInput.toLowerCase().includes('morning')) {
          enhancedInput = `[Context: Morning time] ${enhancedInput}`;
        } else if (currentHour >= 11 && currentHour < 15 && 
                  !enhancedInput.toLowerCase().includes('lunch')) {
          enhancedInput = `[Context: Lunch time] ${enhancedInput}`;
        } else if (currentHour >= 17 && currentHour < 21 && 
                  !enhancedInput.toLowerCase().includes('dinner')) {
          enhancedInput = `[Context: Dinner time] ${enhancedInput}`;
        }
        
        // Add previous order context if available
        if (orderHistory.length > 0) {
          const recentItems = orderHistory[orderHistory.length - 1].items
            .map(item => item.name)
            .filter((value, index, self) => self.indexOf(value) === index); // Unique items
          
          if (recentItems.length > 0 && 
             (enhancedInput.toLowerCase().includes('recommend') || 
              enhancedInput.toLowerCase().includes('suggest') || 
              enhancedInput.toLowerCase().includes('like'))) {
            enhancedInput = `[Context: Customer previously ordered ${recentItems.join(', ')}] ${enhancedInput}`;
          }
        }
        
        console.log('Enhanced input with context:', enhancedInput);
        
        const aiText = await getAIResponse(enhancedInput, chatHistory);
        
        // For recommendations or menu queries, show actual menu items with images
        const shouldShowMenuItems = 
          enhancedInput.toLowerCase().includes('recommend') || 
          enhancedInput.toLowerCase().includes('suggest') || 
          enhancedInput.toLowerCase().includes('menu') ||
          enhancedInput.toLowerCase().includes('what') && enhancedInput.toLowerCase().includes('have');        // Extract item names mentioned in AI response for suggestion tracking
        const extractMentionedItems = (responseText) => {
          const mentionedItems = [];
          const lowerResponse = responseText.toLowerCase();
          
          // Check each menu item to see if it's mentioned in the response
          menuData.forEach(item => {
            const itemNameLower = item.name.toLowerCase();
            if (lowerResponse.includes(itemNameLower)) {
              mentionedItems.push({
                name: item.name,
                price: item.pricing ? "₱" + Object.values(item.pricing)[0] : "",
                description: item.description || "",
                image: item.image || "",
                category: item.category || "",
                fullItem: item // Store the complete item data
              });
            }
          });
          
          return mentionedItems;
        };
        
        // Track mentioned items as suggestions
        const mentionedItems = extractMentionedItems(aiText);
        if (mentionedItems.length > 0) {
          setRecentlySuggestedItems(mentionedItems);
          setLastSuggestionTime(Date.now());
        }
        
        // Text response
        const botResponse = {
          id: generateUniqueId(),
          text: aiText,
          sender: 'bot',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);
        
        // Add carousel of suggested items based on the query for certain types of questions
        if (shouldShowMenuItems && !staticResponseSent) {
          // Extract categories and filter relevant items
          // Determine which category to show based on the query
          const query = enhancedInput.toLowerCase();
          let relevantItems = [];
          
          if (query.includes('drink') || query.includes('beverage') || query.includes('thirsty')) {
            relevantItems = menuData.filter(item => item.category === 'Beverages');
          } else if (query.includes('food') || query.includes('meal') || query.includes('hungry')) {
            relevantItems = menuData.filter(item => item.category === 'Food');
          } else if (query.includes('dessert') || query.includes('sweet')) {
            relevantItems = menuData.filter(item => item.category === 'Desserts');
          } else if (query.includes('hot') || query.includes('warm')) {
            // Suggests cold drinks and light foods for hot weather
            relevantItems = menuData.filter(item => 
              (item.category === 'Beverages' && 
               (item.name.toLowerCase().includes('iced') || 
                item.name.toLowerCase().includes('cold'))) || 
              item.category === 'Desserts'
            );
          } else if (query.includes('cold')) {
            // Suggests hot drinks and comfort foods for cold weather
            relevantItems = menuData.filter(item => 
              (item.category === 'Beverages' && 
               (item.name.toLowerCase().includes('hot') || 
                item.subCategory === 'Coffee')) || 
              (item.category === 'Food' && item.subCategory === 'Main Dishes')
            );
          } else {
            // Default: Show popular or random items across categories
            if (revenueData?.topItems?.length > 0) {
              // Get names of top selling items
              const topSellerNames = revenueData.topItems.map(item => item.name);
              // Find these items in the menu data
              relevantItems = menuData.filter(item => topSellerNames.includes(item.name));
            } else {
              // If no revenue data, get a sampling of items across categories
              const categories = [...new Set(menuData.map(item => item.category))];
              for (const category of categories) {
                const itemsInCategory = menuData.filter(item => item.category === category);
                if (itemsInCategory.length > 0) {
                  // Get 1-2 random items from each category
                  const randomItems = itemsInCategory
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.min(2, itemsInCategory.length));
                  relevantItems.push(...randomItems);
                }
              }
            }
          }
          
          // Limit to a reasonable number of items for display
          relevantItems = relevantItems.slice(0, Math.min(6, relevantItems.length));          if (relevantItems.length > 0) {
            // Track suggested items for order confirmation
            const suggestedItems = relevantItems.map(item => ({
              name: item.name,
              price: item.pricing ? "₱" + Object.values(item.pricing)[0] : "",
              description: item.description || "",
              image: item.image || "",
              category: item.category || "",
              fullItem: item // Store the complete item data
            }));
            
            setRecentlySuggestedItems(suggestedItems);
            setLastSuggestionTime(Date.now());
            
            // Add a small delay so the text appears first
            setTimeout(() => {
              const menuMessage = {
                id: generateUniqueId(),
                text: "",
                sender: 'bot',
                type: 'menu-items',
                items: suggestedItems,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, menuMessage]);
            }, 800);
          }
        }
      } catch (error) {
        console.error("Error getting AI response:", error);
        // Provide a fallback response in case of error
        setMessages(prev => [...prev, {
          id: generateUniqueId(),
          text: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
          sender: 'bot',
          timestamp: new Date()
        }]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleOrderConfirmation = (confirmed) => {
    if (!pendingOrder || pendingOrder.length === 0) return;
    
    if (confirmed) {
      // Add all pending items to the order
      for (const match of pendingOrder) {
        const { menuItem, quantity, size } = match;
        // Add the item to the order with quantity
        addToCurrentOrder(menuItem, size, quantity);
      }
      
      // Show confirmation
      const itemDescriptions = pendingOrder.map(match => 
        `${match.quantity} ${match.menuItem.name} (${match.size})`
      );
      
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: `Great! I've added ${itemDescriptions.join(", ")} to your order.`,
        sender: 'bot',
        timestamp: new Date()
      }]);
    } else {
      // Rejection
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        text: `No problem. What would you like to order instead?`,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
    
    // Clear pending order
    setPendingOrder(null);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  // Suggestion buttons component
  const SuggestionButtons = ({ suggestions, onClick }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {suggestions.map(suggestion => (
          <button
            key={suggestion.id}
            onClick={() => onClick(suggestion.text)}
            className="px-3 py-1.5 text-xs md:text-sm rounded-full transition-colors"
            style={{
              backgroundColor: colors.primary + '10',
              color: colors.primary,
              border: `1px solid ${colors.primary}30`
            }}
          >
            {suggestion.text}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
      <header className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: colors.primary, borderColor: colors.muted }}>
        <div className="flex items-center">
          <ChatbotAvatar />
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.background }}>Café Assistant</h1>
            <p className="text-xs" style={{ color: colors.muted }}>Powered by Ring & Wing</p>
          </div>        </div>
        <div className="flex items-center">
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
                <p>{message.text}</p>                {message.type === 'menu-items' && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-sm" style={{ color: colors.primary }}>
                        Menu Items
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.accent + '20', color: colors.accent }}>
                        {message.items.length} items
                      </span>
                    </div>
                    
                    <div className="relative">
                      <div 
                        className="overflow-x-scroll pb-4 hide-scrollbar" 
                        style={{ 
                          scrollBehavior: 'smooth',
                          WebkitOverflowScrolling: 'touch'
                        }}
                      >
                        <div 
                          className="flex space-x-3" 
                          style={{ width: `${message.items.length * 220}px` }}
                        >
                          {message.items.map((item, index) => (
                            <div
                              key={`menu-item-${index}-${item.name}`}
                              className="w-52 rounded-lg overflow-hidden shadow-md flex-shrink-0 transition-all hover:shadow-lg"
                              style={{ 
                                backgroundColor: colors.background, 
                                border: `1px solid ${colors.muted}30`,
                                transform: 'scale(1)',
                                transition: 'all 0.2s ease',
                                scrollSnapAlign: 'start'
                              }}
                            ><div className="h-32 overflow-hidden relative">
                                <MenuItemImage
                                  image={item.image}
                                  category={item.category}
                                  alt={item.name}
                                  size="100%"
                                  className="w-full h-full"
                                />
                                <div className="absolute top-0 right-0 m-2 px-2 py-1 rounded-full text-xs font-medium" 
                                  style={{ backgroundColor: colors.accent, color: colors.background }}>
                                  {item.price}
                                </div>
                              </div>
                              
                              <div className="p-3">
                                <h4 className="font-semibold truncate" style={{ color: colors.primary }}>
                                  {item.name}
                                </h4>
                                <p className="text-xs mt-1 h-8 overflow-hidden" style={{ color: colors.secondary }}>
                                  {item.description || "No description available"}
                                </p>
                                <button
                                  onClick={() => handleOrderItem(item)}
                                  className="w-full mt-2 py-1.5 text-sm font-medium rounded-md transition-all"
                                  style={{ 
                                    backgroundColor: colors.accent,
                                    color: colors.background,
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                  }}
                                >
                                  Add to Order
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        className="absolute top-1/2 -left-4 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-lg cursor-pointer hover:bg-gray-50 border border-gray-200 z-10"
                        onClick={(e) => {
                          // Get the parent scroll container
                          const container = e.currentTarget.parentElement.querySelector('.overflow-x-scroll');
                          container.scrollLeft -= 220;
                        }}
                      >
                        <FiChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        className="absolute top-1/2 -right-4 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-lg cursor-pointer hover:bg-gray-50 border border-gray-200 z-10"
                        onClick={(e) => {
                          // Get the parent scroll container
                          const container = e.currentTarget.parentElement.querySelector('.overflow-x-scroll');
                          container.scrollLeft += 220;
                        }}
                      >
                        <FiChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
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
      <CheckoutForm />      <div className="px-4 pb-2">
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
      </div><form onSubmit={handleSendMessage} className="p-4 border-t" style={{ borderColor: colors.muted }}>
        <div className="max-w-3xl mx-auto flex">          <input
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
        </div>      </form>

      <style>{`
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
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
}

export default ChatbotPage;