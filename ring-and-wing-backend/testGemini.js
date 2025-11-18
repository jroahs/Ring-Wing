const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say hello in a friendly way.");
    console.log("✓ API Success!");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("✗ API Error:", err.message);
  }
}

test();
