/**
 * Gemini API Diagnostic Script
 * This script tests direct connections to the Gemini API
 */

const axios = require('axios');
require('dotenv').config();

async function testGeminiApiDirectly() {
  console.log('Running Gemini API direct connection test...');
  
  try {
    // Simple test prompt
    const prompt = "Tell me a very short joke about chicken wings";
    
    // Gemini API request format
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    };
    
    // Use environment variable for API key security
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY environment variable is required');
      return false;
    }
    
    console.log('Sending direct request to Gemini API...');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('✅ Gemini API response received!');
    console.log('Status:', response.status);
    console.log('Full response data:', JSON.stringify(response.data, null, 2));
    
    // Try to access the response text safely
    try {
      const responseText = response.data.candidates[0].content.parts[0].text;
      console.log('Response text:', responseText);
    } catch (parseError) {
      console.log('Could not parse response text, structure might have changed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('No response received from API. Network issue?');
    }
    
    return false;
  }
}

async function testServerEndpoint() {
  console.log('\nTesting local server /api/chat endpoint...');
  
  try {
    // Basic request payload 
    const payload = {
      model: "gemini-2.5-flash",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that responds in very short sentences." 
        },
        { 
          role: "user", 
          content: "Say hello in 5 words or less" 
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    };
    
    console.log('Sending request to local server...');
    const response = await axios.post(
      'http://localhost:5000/api/chat',
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ Server response received!');
    console.log('Status:', response.status);
    
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      console.log('Response:', response.data.choices[0].message.content);
    } else {
      console.log('Unexpected response format:', response.data);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    }
    
    return false;
  }
}

// Run the tests
async function runDiagnostics() {
  console.log('======= GEMINI API DIAGNOSTICS =======');
  console.log('Running tests to diagnose Gemini API integration issues\n');
  
  // Test 1: Direct Gemini API
  const directApiSuccess = await testGeminiApiDirectly();
  
  // Test 2: Local server endpoint
  const serverApiSuccess = await testServerEndpoint();
  
  // Summary
  console.log('\n======= DIAGNOSTICS SUMMARY =======');
  console.log('Direct Gemini API:', directApiSuccess ? '✅ PASSED' : '❌ FAILED');
  console.log('Local Server API:', serverApiSuccess ? '✅ PASSED' : '❌ FAILED');
  
  if (!directApiSuccess && !serverApiSuccess) {
    console.log('\n❌ Both tests failed. There may be an issue with the API key or internet connectivity.');
  } else if (!directApiSuccess) {
    console.log('\n❌ Direct API test failed but server test passed. Check how the API key is being used.');
  } else if (!serverApiSuccess) {
    console.log('\n❌ Server test failed but direct API test passed. The server implementation has issues.');
  } else {
    console.log('\n✅ All tests passed! The API integration appears to be working correctly.');
  }
}

// Run the diagnostics
runDiagnostics();
