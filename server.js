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

// Function to upload thumbnail to Cloudinary
async function uploadThumbnailToCloudinary(thumbnailUrl, templateId) {
  try {
    console.log("Uploading thumbnail to Cloudinary:", thumbnailUrl);

    const result = await cloudinary.uploader.upload(thumbnailUrl, {
      folder: "canva-thumbnails",
      public_id: `thumbnail_${templateId}_${Date.now()}`,
      tags: ["canva", "thumbnail", "autofill"],
      transformation: [
        { width: 1080, height: 1080, crop: "fit" },
        { quality: "auto" },
      ],
    });

    console.log("Thumbnail uploaded successfully:", result.public_id);
    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

// Canva Autofill API endpoint
app.post("/api/canva/autofill", async (req, res) => {
  try {
    const { brand_template_id, data } = req.body;

    // Validate required fields
    if (!brand_template_id || !data) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: brand_template_id and data are required",
      });
    }

    // Get valid access token
    let token;
    try {
      token = await auth.getValidToken();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Authentication required: " + error.message,
      });
    }

    console.log("Generating Canva autofill with template:", brand_template_id);

    // Call Canva Autofill API
    const canvaResponse = await axios.post(
      "https://api.canva.com/rest/v1/autofills",
      {
        brand_template_id: brand_template_id,
        data: data,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log("Canva autofill job created:", canvaResponse.data.job.id);

    // Poll job status until completion
    const jobId = canvaResponse.data.job.id;
    let jobStatus = "in_progress";
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute max

    while (jobStatus === "in_progress" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;

      try {
        const statusResponse = await axios.get(
          `https://api.canva.com/rest/v1/autofills/${jobId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        jobStatus = statusResponse.data.job.status;
        console.log(`Job ${jobId} status: ${jobStatus} (attempt ${attempts})`);

        if (jobStatus === "success") {
          const designUrl = statusResponse.data.job.result.design.url;
          const thumbnailUrl =
            statusResponse.data.job.result.design.thumbnail.url;

          try {
            // Upload thumbnail to Cloudinary
            const cloudinaryResult = await uploadThumbnailToCloudinary(
              thumbnailUrl,
              brand_template_id
            );

            return res.json({
              success: true,
              job_id: jobId,
              status: "success",
              design_url: designUrl,
              thumbnail_url: thumbnailUrl,
              cloudinary_url: cloudinaryResult.secure_url,
              public_id: cloudinaryResult.public_id,
              template_id: brand_template_id,
              attempts: attempts,
              timestamp: new Date().toISOString(),
            });
          } catch (uploadError) {
            console.error("Cloudinary upload failed:", uploadError);
            // Return without Cloudinary URL if upload fails
            return res.json({
              success: true,
              job_id: jobId,
              status: "success",
              design_url: designUrl,
              thumbnail_url: thumbnailUrl,
              cloudinary_url: null,
              error: "Thumbnail upload to Cloudinary failed",
              template_id: brand_template_id,
              attempts: attempts,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error checking job status:", error.message);
        break;
      }
    }

    // If job didn't complete in time
    res.json({
      success: false,
      job_id: jobId,
      status: jobStatus,
      error: "Job did not complete within timeout period",
      attempts: attempts,
      template_id: brand_template_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Canva autofill error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to generate Canva autofill",
      details: error.response?.data || error.message,
    });
  }
});

// Simple API endpoint for Softr integration
app.post("/api/generate-image", async (req, res) => {
  try {
    const { template_id, text_data } = req.body;

    // Validate input
    if (!template_id || !text_data) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: template_id and text_data are required",
      });
    }

    // Get valid token (handles refresh automatically)
    let token;
    try {
      token = await auth.getValidToken();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error:
          "Authentication required. Please authenticate first by visiting /api/auth/canva",
        auth_url: `${req.protocol}://${req.get("host")}/api/auth/canva`,
      });
    }

    // Prepare data for Canva autofill
    const canvaData = {};
    Object.keys(text_data).forEach((key) => {
      canvaData[key] = {
        type: "text",
        text: text_data[key],
      };
    });

    console.log("Generating Canva autofill with template:", template_id);

    // Call Canva autofill API
    const canvaResponse = await axios.post(
      "https://api.canva.com/rest/v1/autofills",
      {
        brand_template_id: template_id,
        data: canvaData,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("Canva autofill job created:", canvaResponse.data.job.id);

    const jobId = canvaResponse.data.job.id;
    let jobStatus = "in_progress";
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute max

    // Poll for job completion
    while (jobStatus === "in_progress" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;

      try {
        const statusResponse = await axios.get(
          `https://api.canva.com/rest/v1/autofills/${jobId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        jobStatus = statusResponse.data.job.status;
        console.log(`Job ${jobId} status: ${jobStatus} (attempt ${attempts})`);

        if (jobStatus === "success") {
          const designUrl = statusResponse.data.job.result.design.url;
          const thumbnailUrl =
            statusResponse.data.job.result.design.thumbnail.url;

          // Upload thumbnail to Cloudinary
          try {
            const cloudinaryResult = await uploadThumbnailToCloudinary(
              thumbnailUrl,
              template_id
            );

            return res.json({
              success: true,
              job_id: jobId,
              status: "success",
              design_url: designUrl,
              thumbnail_url: thumbnailUrl,
              cloudinary_url: cloudinaryResult.secure_url,
              public_id: cloudinaryResult.public_id,
              template_id: template_id,
              attempts: attempts,
              timestamp: new Date().toISOString(),
            });
          } catch (uploadError) {
            console.error("Cloudinary upload failed:", uploadError);
            return res.json({
              success: true,
              job_id: jobId,
              status: "success",
              design_url: designUrl,
              thumbnail_url: thumbnailUrl,
              cloudinary_url: null,
              error: "Thumbnail upload to Cloudinary failed",
              template_id: template_id,
              attempts: attempts,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error checking job status:", error.message);
        break;
      }
    }

    res.json({
      success: false,
      job_id: jobId,
      status: jobStatus,
      error: "Job did not complete within timeout period",
      attempts: attempts,
      template_id: template_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Image generation error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to generate image",
      details: error.response?.data || error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Canva Template API running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authenticate: GET http://localhost:${PORT}/api/auth/canva`);
  console.log(
    `🎨 Generate Image (Softr): POST http://localhost:${PORT}/api/generate-image`
  );
  console.log(
    `📋 Canva Autofill: POST http://localhost:${PORT}/api/canva/autofill`
  );
});

module.exports = app;
