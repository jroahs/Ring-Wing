/**
 * AI-powered order intent detection
 * Uses the Gemini model to analyze user messages for order intent
 */
import { findBestMenuItemMatch } from './orderParser'; // Assuming findBestMenuItemMatch is in orderParser.js

export const detectOrderIntentWithAI = async (message, menuItems, chatHistory = [], detectedLanguage = 'english') => {
  // Early rejection of obvious non-order messages
  const quickCheck = message.toLowerCase();
  if (quickCheck.length < 3 || 
      quickCheck.endsWith('?') ||
      quickCheck.includes('what') || 
      quickCheck.includes('how') ||
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
    4. Look for phrases like "I want", "I'll have", "give me", "can I get", etc.
    5. Return a structured response with confidence level
    6. If ordering intent is detected, extract the specific items, quantities, and sizes`
  };

  const userPrompt = {
    role: "user",
    content: `Message: "${message}"
    
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
    
    const result = JSON.parse(jsonStr);
    
    // Map AI detected items to actual menu items
    if (result.hasOrderIntent && result.items?.length > 0) {
      result.items = result.items.map(item => {
        const menuItem = findBestMenuItemMatch(item.name, menuItems);
        if (menuItem) {
          return {
            menuItem: menuItem,
            quantity: parseInt(item.quantity, 10) || 1, // Ensure quantity is a number
            size: item.size || (menuItem.pricing ? Object.keys(menuItem.pricing)[0] : 'base'),
            confidence: item.confidence || "medium"
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
