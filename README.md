# Canva Instagram Post Generator API

A streamlined backend API that generates custom Instagram posts using Canva templates and returns them via Cloudinary.

## 🎯 Implementation Flow

1. **Softr Form** → Sends text input + template ID to backend
2. **Backend** → Calls Canva API to insert text into template
3. **Canva API** → Generates finished image
4. **Cloudinary** → Stores the generated image
5. **Softr** → Receives Cloudinary URL for display/download

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment:**

   ```bash
   cp env.example .env
   # Add your real API keys to .env
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

4. **Test the API:**
   ```bash
   node test-api.js
   ```

## 📡 API Endpoints

### Generate Instagram Post

```
POST /api/generate-instagram-post
```

**Request Body:**

```json
{
  "text": "Your Instagram post text here",
  "templateId": "instagram-template-1"
}
```

**Response:**

```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/instagram_1234567890.jpg",
  "publicId": "instagram_1234567890",
  "templateId": "instagram-template-1",
  "text": "Your Instagram post text here",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Get Available Templates

```
GET /api/instagram-templates
```

**Response:**

```json
{
  "success": true,
  "templates": [
    {
      "id": "instagram-template-1",
      "name": "Modern Quote Post",
      "description": "Clean design perfect for inspirational quotes",
      "thumbnail": "https://via.placeholder.com/300x300/FF6B6B/FFFFFF?text=Quote+Post",
      "dimensions": "1080x1080"
    }
  ]
}
```

### Health Check

```
GET /health
```

## 🔧 Environment Variables

Create a `.env` file with:

```env
# Canva API Configuration
CANVA_API_KEY=your_canva_api_key_here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 🎨 Softr Integration

### Step 1: Create Form in Softr

- Add text input field
- Add dropdown for template selection
- Add submit button

### Step 2: Configure Custom Action

- **URL:** `https://your-api-domain.com/api/generate-instagram-post`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "text": "{{text_input_field}}",
    "templateId": "{{template_dropdown}}"
  }
  ```

### Step 3: Display Result

- Use the returned `imageUrl` to display the generated Instagram post
- Add download button using the same URL

## 🧪 Testing

Run the test script to verify everything works:

```bash
node test-api.js
```

This will test:

- ✅ Health endpoint
- ✅ Templates endpoint
- ✅ Test endpoint
- ⚠️ Instagram generation (requires real API keys)

## 📋 Development Progress

- ✅ **Day 1:** API foundation and endpoints ready
- 🔄 **Day 2:** Canva API integration testing
- ⏳ **Day 3:** Cloudinary optimization
- ⏳ **Day 4:** Softr integration testing
- ⏳ **Day 5:** Instagram post demo
- ⏳ **Day 6:** Error handling improvements
- ⏳ **Day 7:** Final testing and deployment

## 🎯 Demo Goal

**Working demo:** Input text on Softr → Get back customized Instagram post via Cloudinary

The API is designed specifically for this workflow and optimized for Instagram post generation with proper dimensions (1080x1080) and Cloudinary storage.
