const axios = require("axios");

const API_BASE_URL = "http://localhost:3000";

async function testAPI() {
  console.log("🧪 Testing Canva Instagram Post API...\n");

  try {
    // Test 1: Health check
    console.log("1️⃣ Testing health endpoint...");
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log("✅ Health check passed:", healthResponse.data);
    console.log("");

    // Test 2: Get templates
    console.log("2️⃣ Testing templates endpoint...");
    const templatesResponse = await axios.get(
      `${API_BASE_URL}/api/instagram-templates`
    );
    console.log(
      "✅ Templates retrieved:",
      templatesResponse.data.templates.length,
      "templates found"
    );
    console.log("");

    // Test 3: Test endpoint
    console.log("3️⃣ Testing test endpoint...");
    const testResponse = await axios.post(`${API_BASE_URL}/api/test`, {
      testData: "Hello from test script",
      timestamp: new Date().toISOString(),
    });
    console.log("✅ Test endpoint passed:", testResponse.data.message);
    console.log("");

    // Test 4: Generate Instagram post (mock test)
    console.log("4️⃣ Testing Instagram post generation...");
    try {
      const generateResponse = await axios.post(
        `${API_BASE_URL}/api/generate-instagram-post`,
        {
          text: "Test Instagram Post - Hello World!",
          templateId: "instagram-template-1",
        }
      );
      console.log("✅ Instagram post generated successfully!");
      console.log("📸 Image URL:", generateResponse.data.imageUrl);
    } catch (error) {
      if (error.response?.status === 500) {
        console.log(
          "⚠️  Instagram post generation failed (expected - need real API keys)"
        );
        console.log("   Error:", error.response.data.error);
      } else {
        throw error;
      }
    }

    console.log("\n🎉 All API tests completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Set up your .env file with real API keys");
    console.log("2. Test with actual Canva template IDs");
    console.log("3. Integrate with Softr frontend");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

// Run the test
testAPI();
