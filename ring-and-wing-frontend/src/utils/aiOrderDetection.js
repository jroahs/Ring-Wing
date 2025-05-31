/**
 * AI-powered order intent detection
 * Uses the Gemini model to analyze user messages for order intent
 */
import { findBestMenuItemMatch } from './orderParser'; // Assuming findBestMenuItemMatch is in orderParser.js

export const detectOrderIntentWithAI = async (message, menuItems, chatHistory = [], detectedLanguage = 'english') => {  // Early rejection of obvious non-order messages
  const quickCheck = message.toLowerCase();
  if (quickCheck.length < 2 || 
      (quickCheck.endsWith('?') && !quickCheck.includes('can i get') && !quickCheck.includes('can i have')) ||
      (quickCheck.includes('what') && !quickCheck.includes('what about')) || 
      quickCheck.includes('how much') ||
      quickCheck.includes('how many') ||
      quickCheck.includes('why')) {
    return { hasOrderIntent: false, items: [] };
  }

  // Prepare system prompt for order detection
  const systemPrompt = {
    role: "system",
    content: `You are an order intent classifier for a café. Analyze if this message indicates a customer wanting to order items.
    
    Available menu items:
    ${menuItems.map(item => `- ${item.name} (${item.category || 'Uncategorized'})`).join('\n')}
      Instructions:
    1. ONLY identify actual ordering intent (customer wants to add items to their order)
    2. Asking about an item is NOT an order intent
    3. Simple mentions of menu items are NOT orders
    4. Look for phrases like "I want", "I'll have", "give me", "can I get", "add", "order", etc.
    5. Return a structured response with confidence level
    6. If ordering intent is detected, extract the specific items, quantities, and sizes
    7. Be generous with "high" confidence for clear ordering phrases
    8. Use "medium" confidence for implicit orders (just item names with quantities)
    9. Only use "low" confidence when uncertain`
  };
  const userPrompt = {
    role: "user",
    content: `Message: "${message}"
    
    Examples of HIGH confidence orders:
    - "I want 2 milkteas"
    - "Give me a burger"
    - "I'll have 3 coffees"
    - "Can I get pizza"
    - "Add a sandwich"
    - "Order milktea"
    - "2 milkteas please"
    - "milktea medium"
    
    Examples of MEDIUM confidence orders:
    - "milktea" (just item name)
    - "2 milkteas" (quantity + item)
    - "large coffee" (size + item)
    
    Examples of NO order intent:
    - "What's in the burger?"
    - "How much is coffee?"
    - "Do you have milktea?"
    
    Respond ONLY with valid JSON in this exact format:
    {
      "hasOrderIntent": true/false,
      "confidence": "high/medium/low", 
      "items": [
        {
          "name": "exact menu item name",
          "quantity": "number",
          "size": "size if specified or null",
          "confidence": "high/medium/low"
        }
      ]
    }
    
    If no order intent, return empty items array.`
  };

  try {
    const payload = {
      model: "gemini-1.5-flash",
      messages: [systemPrompt, userPrompt],
      temperature: 0.2,
      max_tokens: 350
    };
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error("Error detecting order intent with AI:", response.status, await response.text());
      return { hasOrderIntent: false, items: [] };
    }
    
    const data = await response.json();
    // It's good practice to check if choices exist and have content
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error("Invalid AI response structure:", data);
        return { hasOrderIntent: false, items: [] };
    }
    const content = data.choices[0].message.content;
    
    // Extract the JSON from the response - handle potential formatting issues
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('{')) {
      // More robust extraction of JSON object
      const startIndex = content.indexOf('{');
      const endIndex = content.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonStr = content.substring(startIndex, endIndex + 1);
      } else {
        console.error("Could not extract JSON from AI response:", content);
        return { hasOrderIntent: false, items: [] };
      }
    } else {
        console.error("No JSON found in AI response:", content);
        return { hasOrderIntent: false, items: [] };
    }
    
    const result = JSON.parse(jsonStr);    // Map AI detected items to actual menu items
    if (result.hasOrderIntent && result.items?.length > 0) {
      result.items = result.items.map(item => {
        const menuItem = findBestMenuItemMatch(item.name, menuItems);
        if (menuItem) {
          const availableSizes = menuItem.pricing ? Object.keys(menuItem.pricing) : ['base'];
          const hasMultipleSizes = availableSizes.length > 1;
            // If no size specified and multiple sizes available, we need to ask for size preference
          let finalSize = item.size;
          let needsSizeSelection = false;
          
          // Try to normalize the size if provided
          if (finalSize) {
            // Case-insensitive search in available sizes
            const normalizedSize = availableSizes.find(size => 
              size.toLowerCase() === finalSize.toLowerCase() ||
              size.toLowerCase().includes(finalSize.toLowerCase()) ||
              finalSize.toLowerCase().includes(size.toLowerCase().replace(/[()]/g, ''))
            );
            
            if (normalizedSize) {
              finalSize = normalizedSize; // Use the proper case from menu data
            }
          }
          
          if (!finalSize) {
            if (hasMultipleSizes) {
              // Check if the menu item has a default size preference
              const defaultSize = menuItem.defaultSize || null;
              
              if (defaultSize && availableSizes.includes(defaultSize)) {
                finalSize = defaultSize;
              } else {
                needsSizeSelection = true;
                finalSize = null; // Don't default to any size
              }
            } else {
              finalSize = availableSizes[0] || 'base';
            }
          }
            // More robust quantity parsing
          let quantity = 1;
          if (item.quantity) {
            if (typeof item.quantity === 'number') {
              quantity = item.quantity;
            } else if (typeof item.quantity === 'string') {
              // Handle text quantities like "one", "two", etc.
              const textToNumber = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'a': 1, 'an': 1
              };
              
              const cleanQuantity = item.quantity.toLowerCase().trim();
              if (textToNumber[cleanQuantity]) {
                quantity = textToNumber[cleanQuantity];
              } else {
                quantity = parseInt(item.quantity, 10) || 1;
              }
            }
          }
          
          console.log(`AI detected order item: ${quantity}x ${menuItem.name}, size: ${finalSize || 'to be specified'}`);
          
          return {
            menuItem: menuItem,
            quantity: quantity,
            size: finalSize,
            confidence: item.confidence || "medium",
            needsSizeSelection: needsSizeSelection,
            availableSizes: availableSizes
          };
        }
        return null;
      }).filter(Boolean); // Filter out nulls if findBestMenuItemMatch returns null
    }
    
    return result;
  } catch (error) {
    console.error("Error in AI order intent detection (parsing or network):", error);
    // Fallback to basic detection in case of errors
    return { hasOrderIntent: false, items: [] };
  }
};
