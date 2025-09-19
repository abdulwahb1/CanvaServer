const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const auth = require("./auth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins for Softr integration
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Canva Template API is running",
    timestamp: new Date().toISOString(),
  });
});

// OAuth callback endpoint
app.get("/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: "OAuth authorization failed",
        details: error,
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Missing authorization code",
      });
    }

    // Retrieve stored code verifier using state parameter
    const codeVerifier = auth.getCodeVerifier(state);

    if (!codeVerifier) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired state parameter",
      });
    }

    console.log("Received authorization code:", code);
    console.log("Retrieved code verifier for state:", state);

    // Exchange code for tokens
    const tokenResult = await auth.exchangeCodeForToken(code, codeVerifier);

    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to exchange code for tokens",
        details: tokenResult.error,
      });
    }

    console.log("Token exchange successful");
    auth.storeTokens(tokenResult);
    // Clean up stored code verifier
    auth.removeCodeVerifier(state);

    // Return the tokens to the user
    res.json({
      success: true,
      message: "OAuth authentication successful",
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      expires_in: tokenResult.expires_in,
      token_type: tokenResult.token_type,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Authentication endpoint - generates OAuth URL
app.get("/api/auth/canva", async (req, res) => {
  try {
    const authResult = await auth.generateAuthUrl();

    if (!authResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate auth URL",
        details: authResult.error,
      });
    }

    // Redirect user to Canva OAuth
    res.redirect(authResult.authUrl);
  } catch (error) {
    console.error("Auth URL generation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Test endpoint for development
app.post("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working correctly",
    receivedData: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Canva Instagram Post API running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🎨 Generate Instagram post: POST http://localhost:${PORT}/api/generate-instagram-post`
  );
  console.log(
    `📋 Get templates: GET http://localhost:${PORT}/api/instagram-templates`
  );
  console.log(`🧪 Test endpoint: POST http://localhost:${PORT}/api/test`);
});

module.exports = app;
