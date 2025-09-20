# 🎨 Softr Integration Guide

## Overview

This API provides a **simplified endpoint** for Softr integration that handles all the OAuth complexity server-side.

## 🔧 How It Works

### Step 1: One-Time Authentication (Manual)

You need to authenticate **once** to get tokens:

1. **Start your server:**

   ```bash
   npm run dev
   ```

2. **Visit the auth URL:**

   ```
   http://127.0.0.1:3000/api/auth/canva
   ```

3. **Complete OAuth flow** in your browser
4. **Tokens are stored** automatically on the server

### Step 2: Softr Integration

Softr can now call the simple API endpoint:

**Endpoint:** `POST /api/generate-image`

**Request Body:**

```json
{
  "template_id": "your_canva_template_id",
  "text_data": {
    "TITLE": "Your Title Here",
    "SUBTITLE": "Your Subtitle",
    "DESCRIPTION": "Your description text"
  }
}
```

**Response:**

```json
{
  "success": true,
  "job_id": "a71ef223-571c-48a2-9572-e6cf85e3b943",
  "status": "success",
  "design_url": "https://www.canva.com/design/...",
  "thumbnail_url": "https://export-download.canva.com/...",
  "cloudinary_url": "https://res.cloudinary.com/...",
  "public_id": "canva_template_123456",
  "template_id": "your_template_id",
  "attempts": 5,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🚀 Softr Setup

### Option 1: HTTP Request Action

In Softr, create a **Custom Action** with:

- **Method:** POST
- **URL:** `https://your-domain.com/api/generate-image`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body:**
  ```json
  {
    "template_id": "{{Template ID}}",
    "text_data": {
      "TITLE": "{{Title Field}}",
      "SUBTITLE": "{{Subtitle Field}}",
      "DESCRIPTION": "{{Description Field}}"
    }
  }
  ```

### Option 2: Webhook Integration

Set up a webhook in Softr that triggers when a form is submitted.

## 🧪 Testing

### Test the API:

```bash
node test-softr-api.js
```

### Test with curl:

```bash
curl -X POST http://127.0.0.1:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "your_template_id",
    "text_data": {
      "TITLE": "Test Title",
      "SUBTITLE": "Test Subtitle"
    }
  }'
```

## 🔐 Authentication Status

**Check if authenticated:**

```bash
curl http://127.0.0.1:3000/api/generate-image \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"template_id":"test","text_data":{"TITLE":"test"}}'
```

If you get a 401 error, you need to authenticate first.

## 📋 Template Setup

1. **Create a Canva template** with placeholder text
2. **Note the template ID** from Canva
3. **Map your Softr form fields** to the template placeholders

## 🎯 Benefits

- ✅ **No OAuth complexity** for Softr
- ✅ **Automatic token refresh**
- ✅ **Simple API** for Softr integration
- ✅ **Cloudinary upload** included
- ✅ **Error handling** built-in

## 🚨 Important Notes

- **One-time setup:** You only need to authenticate once
- **Server restart:** Tokens are stored in memory, so restarting the server requires re-authentication
- **Production:** Use Redis or database for token storage in production
- **Template IDs:** Make sure you have valid Canva template IDs

## 🔧 Troubleshooting

### "Authentication required" error:

1. Visit `http://127.0.0.1:3000/api/auth/canva`
2. Complete the OAuth flow
3. Try the API again

### "Template not found" error:

1. Verify the template ID is correct
2. Make sure the template exists in your Canva account
3. Check if you have permission to access the template

### "Job timeout" error:

1. The Canva job took too long to complete
2. Check your internet connection
3. Try with a simpler template
