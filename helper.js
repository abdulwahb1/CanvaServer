const crypto = require("crypto");

// PKCE Helper Functions
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.randomFillSync(array);
  return base64URLEncode(array);
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return base64URLEncode(hash);
}

function base64URLEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  base64URLEncode,
};
