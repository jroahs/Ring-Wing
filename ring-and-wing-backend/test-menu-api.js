const axios = require('axios');

async function testMenuAPI() {
  try {
    const payload = {
      messages: [
        {
          role: "system",
          content: "You are a professional food writer who creates appetizing, appealing food descriptions for cafe menus. Keep descriptions between 20-40 words. Highlight flavors, textures, and key ingredients. Use vivid, sensory language that makes the dish sound delicious. Focus on what makes this item special. Be authentic and accurate to the actual food described. Never use markdown or special formatting"
        },
        {
          role: "user",
          content: "Create a short, appealing menu description for \"Buffalo Wings\" based on this basic description: \"Spicy chicken wings with buffalo sauce\""
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    };

    console.log('Testing menu description API...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post('http://localhost:5000/api/chat', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMenuAPI();
