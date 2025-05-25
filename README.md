# Yearn - Natural Language Query Interface for Vector Databases

A modern, full-stack web application that provides a ChatGPT-like interface for querying Qdrant vector databases using natural language.

## 🏗️ **Architecture**

This is a **unified Next.js application** that combines both frontend and backend functionality:

- **Frontend**: React + Next.js + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes (serverless functions)
- **Vector Database**: Qdrant Cloud integration
- **AI/LLM**: OpenAI GPT-3.5 & Google Gemini support
- **Deployment**: Docker + Render ready

## 📁 **Project Structure**

```
yearn/                          # Root directory
├── pages/                      # Next.js pages & API routes
│   ├── api/                    # Backend API endpoints
│   │   ├── health.ts           # Health check endpoint
│   │   └── ask.ts              # Natural language query endpoint
│   ├── _app.tsx                # App wrapper
│   └── index.tsx               # Main chat interface page
├── components/                 # React components
│   ├── ui/                     # shadcn/ui components
│   └── chat-interface.tsx      # Main chat component
├── lib/                        # Shared utilities & logic
│   ├── api.ts                  # Frontend API calls
│   ├── types.ts                # TypeScript interfaces
│   ├── schemas.ts              # Zod validation schemas
│   └── qdrant/                 # Vector database logic
│       ├── db.ts               # Qdrant client
│       └── nlp-query.ts        # Natural language processing
├── styles/                     # Global CSS styles
├── public/                     # Static assets
├── Dockerfile                  # Production container
├── docker-compose.yml          # Local development
├── package.json                # Dependencies & scripts
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18.0+ (18.17+ recommended)
- npm or yarn
- Qdrant Cloud account (or local Qdrant instance)
- OpenAI API key (optional, has fallback)
- Google Gemini API key (optional)

### **1. Clone & Install**

```bash
git clone <your-repo-url>
cd yearn
npm install
```

### **2. Environment Setup**

Create a `.env` file in the root directory:

```env
# Qdrant Configuration
QDRANT_URL=your-qdrant-cloud-url
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_HTTPS=true

# AI/LLM API Keys (optional - has pattern matching fallback)
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### **3. Development**

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### **4. Production Build**

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🐳 **Docker Deployment**

### **Local Docker**

```bash
# Build and run with Docker Compose
npm run docker:up

# Or manually
docker build -t yearn .
docker run -p 3000:3000 --env-file .env yearn
```

### **Render Deployment**

1. **Connect your GitHub repository** to Render
2. **Create a new Web Service** with these settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Add your `.env` variables
3. **Deploy** - Render will automatically build and deploy

### **Alternative: Docker on Render**

1. **Create a new Web Service**
2. **Select "Docker"** as the environment
3. **Set Dockerfile path**: `./Dockerfile`
4. **Add environment variables** from your `.env`

## 🔧 **Configuration**

### **Environment Variables**

| Variable         | Required | Description               |
| ---------------- | -------- | ------------------------- |
| `QDRANT_URL`     | ✅       | Your Qdrant Cloud URL     |
| `QDRANT_API_KEY` | ✅       | Your Qdrant API key       |
| `QDRANT_HTTPS`   | ❌       | Use HTTPS (default: true) |
| `OPENAI_API_KEY` | ❌       | OpenAI API key for GPT    |
| `GEMINI_API_KEY` | ❌       | Google Gemini API key     |

### **Next.js Configuration**

The `next.config.js` includes:

- Standalone output for Docker
- Webpack externals for server-side modules
- Environment variable exposure

## 🎯 **Features**

### **Natural Language Queries**

- **Count**: "How many artists are in this collection?"
- **Search**: "Find me images by Chris Dyer"
- **List**: "Show me all unique artists"
- **Filter**: "Images with .jpeg extension"
- **Describe**: "Tell me about this collection"

### **AI/LLM Integration**

- **Primary**: OpenAI GPT-3.5 Turbo
- **Secondary**: Google Gemini Pro
- **Fallback**: Pattern matching (works without API keys)

### **User Interface**

- **ChatGPT-like interface** with conversation history
- **Real-time responses** with loading states
- **Collection & provider selection** dropdowns
- **Query metadata display** (execution time, query type)
- **Responsive design** with Tailwind CSS

## 📊 **API Endpoints**

### **GET /api/health**

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-05-25T19:40:03.826Z"
}
```

### **POST /api/ask**

Natural language query endpoint.

**Request:**

```json
{
  "collection": "midjourneysample",
  "question": "How many artists are there?",
  "provider": "openai"
}
```

**Response:**

```json
{
  "question": "How many artists are there?",
  "answer": "I found 1000 unique artists in the collection...",
  "query_type": "count",
  "data": { "count": 1000, "artists": ["Chris Dyer", "..."] },
  "execution_time_ms": 1250
}
```

## 🧪 **Testing**

### **API Testing**

```bash
# Health check
curl http://localhost:3000/api/health

# Natural language query
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How many artists?", "collection": "midjourneysample", "provider": "openai"}'
```

### **Frontend Testing**

1. Open http://localhost:3000
2. Select your collection and provider
3. Ask questions like:
   - "How many artists are in this collection?"
   - "Find me images by Chris Dyer"
   - "List all unique artists"

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Node.js Version**: Ensure you're using Node.js 18.17+
2. **API Keys**: Check your Qdrant and LLM API keys
3. **Collection Name**: Verify your Qdrant collection exists
4. **CORS Issues**: API routes include CORS headers

### **Logs**

```bash
# Development logs
npm run dev

# Production logs
docker logs <container-id>
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Built with ❤️ using Next.js, Qdrant, and modern web technologies.**
