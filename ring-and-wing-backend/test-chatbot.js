/**
 * Test script for the Chatbot API integration with Gemini
 * This script tests if the menu context is correctly being sent to and processed by the Gemini API
 */

const axios = require('axios');
require('dotenv').config();

// Mock menu data - similar structure to what would be in the database
const mockMenuData = [
  {
    name: "Classic Fried Chicken",
    description: "Crispy fried chicken with our secret blend of herbs and spices",
    pricing: { "Small": 150, "Regular": 250, "Family": 450 },
    category: "Fried Chicken"
  },
  {
    name: "Garlic Parmesan Wings",
    description: "Crispy wings tossed in a creamy garlic parmesan sauce",
    pricing: { "6 pcs": 180, "12 pcs": 350 },
    category: "Wings"
  },
  {
    name: "Buffalo Wings",
    description: "Classic spicy buffalo wings served with blue cheese dip",
    pricing: { "6 pcs": 180, "12 pcs": 350 },
    category: "Wings"
  }
];

// Function to generate menu context string (similar to what's in Chatbot.jsx)
function getMenuContext(menuData) {
  if (!menuData.length) return "No menu items available";
  
  return menuData.map(menuItem => {
    const prices = menuItem.pricing 
      ? Object.entries(menuItem.pricing)
          .map(([size, price]) => `${size}: ₱${price}`)
          .join(', ')
      : 'Price not available';
    
    return `- ${menuItem.name}: ${menuItem.description || 'No description'}. Prices: ${prices}. Category: ${menuItem.category || 'Uncategorized'}`;
  }).join('\n');
}

// Test the menu context formatting
function testMenuContextFormatting() {
  console.log('===== MENU CONTEXT FORMATTING TEST =====');
  const menuContext = getMenuContext(mockMenuData);
  console.log(menuContext);
  console.log('\nMenu context length:', menuContext.length, 'characters');
  return menuContext;
}

// Test calling the Gemini API directly with the menu context
async function testGeminiApiDirectly(menuContext) {
  console.log('\n===== DIRECT GEMINI API TEST =====');
  
  try {
    // Create a combined prompt that includes system info and user query
    const systemMessage = `You are Ring & Wing Café's helpful assistant. Here are your guidelines:
1. Available menu items (only talk about these actual items):
${menuContext}
2. Keep responses friendly, professional, and concise.
3. Do not use asterisks or markdown formatting.
4. Never mention competitor restaurants or cafes.
5. Be cheerful and helpful while remaining professional.
6. If asked about unavailable items, say: "I'm sorry, that item isn't available. Would you like me to suggest something from our menu?"
7. Format prices as: "Small: ₱99 | Medium: ₱120"
8. For recommendations, suggest specific items from our menu`;
    
    const userQuestion = "What are your chicken wings options and prices?";
    const combinedPrompt = `${systemMessage}\n\nUser question: ${userQuestion}`;
    
    // Construct the request payload
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: combinedPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC4bXFF2azww8LD_uONuXJKF9Gqg2D9XCI';
    
    // Make the request to Gemini API
    console.log('Sending request to Gemini API...');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      geminiPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log the response
    console.log('Gemini API response status:', response.status);
    console.log('\nResponse:');
    console.log(response.data.candidates[0].content.parts[0].text);
    
    return true;
  } catch (error) {
    console.error('Gemini API test error:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
    return false;
  }
}

// Test the local API endpoint
async function testLocalApiEndpoint(menuContext) {
  console.log('\n===== LOCAL API ENDPOINT TEST =====');
  
  try {
    const systemMessage = {
      role: "system",
      content: `You are Ring & Wing Café's helpful assistant. Here are your guidelines:
1. Available menu items (only talk about these actual items):
${menuContext}
2. Keep responses friendly, professional, and concise.
3. Do not use asterisks or markdown formatting.
4. Never mention competitor restaurants or cafes.
5. Be cheerful and helpful while remaining professional.
6. If asked about unavailable items, say: "I'm sorry, that item isn't available. Would you like me to suggest something from our menu?"
7. Format prices as: "Small: ₱99 | Medium: ₱120"
8. For recommendations, suggest specific items from our menu`
    };
    
    const payload = {
      model: "gemini-1.5-flash",
      messages: [
        systemMessage,
        { role: "user", content: "What chicken wings do you have?" }
      ],
      temperature: 0.7,
      max_tokens: 800
    };
    
    // Make the request to the local API
    console.log('Sending request to local API...');
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      'http://localhost:5000/api/chat',
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    // Log the response
    console.log('Local API response status:', response.status);
    
    if (response.data.error) {
      console.error('API returned error:', response.data.error);
      return false;
    }
    
    if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.error('Invalid response format:', response.data);
      return false;
    }
    
    console.log('\nResponse:');
    console.log(response.data.choices[0].message.content);
    
    return true;
  } catch (error) {
    console.error('Local API test error:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. The request was made but no response was received.');
    } else {
      console.error('Error setting up request:', error.message);
    }
    return false;
  }
}

// Run the tests
async function runTests() {
  try {
    const menuContext = testMenuContextFormatting();
    
    // Test the direct Gemini API
    const directApiTestResult = await testGeminiApiDirectly(menuContext);
    console.log('\nDirect Gemini API test:', directApiTestResult ? 'PASSED' : 'FAILED');
    
    // Test the local API endpoint (optional - only if the server is running)
    try {
      const localApiTestResult = await testLocalApiEndpoint(menuContext);
      console.log('\nLocal API endpoint test:', localApiTestResult ? 'PASSED' : 'FAILED');
    } catch (err) {
      console.log('\nLocal API endpoint test: SKIPPED (Is your server running?)');
    }
    
  } catch (error) {
    console.error('Test run error:', error);
  }
}

// Start the tests
runTests();
