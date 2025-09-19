const crypto = require("crypto");
const axios = require("axios");
const {
  generateCodeVerifier,
  generateCodeChallenge,
  base64URLEncode,
} = require("./helper");

// Store code verifiers temporarily (in production, use Redis or database)
const codeVerifiers = new Map();
const tokenStore = new Map();

const CANVA_ID = process.env.CANVA_CLIENT_ID;
const CANVA_SECRET = process.env.CANVA_CLIENT_SECRET;
const CANVA_REDIRECT = process.env.CANVA_REDIRECT_URI;

// Token Manager Functions
function storeTokens(tokenData) {
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  tokenStore.set("default", {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    token_type: tokenData.token_type,
  });
  console.log("Tokens stored, expires at:", expiresAt);
}

function isTokenExpired(tokenData) {
  // Refresh token if it expires within next 5 minutes
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return tokenData.expires_at <= fiveMinutesFromNow;
}

async function getValidToken() {
  const tokenData = tokenStore.get("default");

  if (!tokenData) {
    throw new Error("No tokens found. Please authenticate first.");
  }

  if (isTokenExpired(tokenData)) {
    console.log("Token expired, refreshing...");
    const refreshResult = await refreshAccessToken(tokenData.refresh_token);

    if (!refreshResult.success) {
      throw new Error("Failed to refresh token: " + refreshResult.error);
    }

    // Store new tokens
    storeTokens(refreshResult);
    return refreshResult.access_token;
  }

  return tokenData.access_token;
}

// Generate OAuth authorization URL with PKCE
async function generateAuthUrl() {
  try {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store code verifier with state for later retrieval
    codeVerifiers.set(state, codeVerifier);

    // Build OAuth URL with generated code challenge and state
    const canvaAuthenticationUrl = `https://www.canva.com/api/oauth/authorize?code_challenge_method=s256&response_type=code&client_id=${CANVA_ID}&redirect_uri=${
      CANVA_REDIRECT || "http://127.0.0.1:3000/callback"
    }&scope=folder:permission:read%20design:content:read%20app:write%20design:content:write%20folder:read%20folder:write%20folder:permission:write%20asset:read%20design:permission:read%20design:permission:write%20brandtemplate:content:read%20comment:read%20profile:read%20brandtemplate:meta:read%20comment:write%20design:meta:read%20app:read%20asset:write&code_challenge=${codeChallenge}&state=${state}`;

    console.log("Generated code verifier:", codeVerifier);
    console.log("Generated code challenge:", codeChallenge);
    console.log("Generated state:", state);
    console.log("OAuth URL:", canvaAuthenticationUrl);

    return {
      success: true,
      codeVerifier: codeVerifier,
      codeChallenge: codeChallenge,
      state: state,
      authUrl: canvaAuthenticationUrl,
    };
  } catch (error) {
    console.error("PKCE generation error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code, codeVerifier) {
  try {
    const tokenUrl = `https://api.canva.com/rest/v1/oauth/token`;

    const response = await axios.post(
      tokenUrl,
      {
        grant_type: "authorization_code",
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: CANVA_REDIRECT || "http://127.0.0.1:3000/callback",
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${CANVA_ID}:${CANVA_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return {
      success: true,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type,
    };
  } catch (error) {
    console.error(
      "Token exchange error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken) {
  try {
    const tokenUrl = `https://api.canva.com/rest/v1/oauth/token`;

    const response = await axios.post(
      tokenUrl,
      {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${CANVA_ID}:${CANVA_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return {
      success: true,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type,
    };
  } catch (error) {
    console.error(
      "Token refresh error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

// Retrieve stored code verifier
function getCodeVerifier(state) {
  return codeVerifiers.get(state);
}

// Remove stored code verifier
function removeCodeVerifier(state) {
  return codeVerifiers.delete(state);
}

// Check if state exists
function hasCodeVerifier(state) {
  return codeVerifiers.has(state);
}

module.exports = {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getCodeVerifier,
  removeCodeVerifier,
  hasCodeVerifier,
  storeTokens, // Add this
  getValidToken, // Add this
  isTokenExpired, // Add this
};
