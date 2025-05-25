# Yearn Frontend

A beautiful, minimalistic Next.js frontend for the Yearn natural language query interface.

## Features

- 🎨 **Beautiful UI**: Built with shadcn/ui and Tailwind CSS
- 💬 **Chat Interface**: ChatGPT-like conversation experience
- 🔄 **Real-time**: Live communication with the backend API
- 📱 **Responsive**: Works on desktop and mobile
- ⚡ **Fast**: Next.js with TypeScript for optimal performance

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure API URL (optional):**
   Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Start the development server:**

```bash
npm run dev
```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. **Collection**: Enter your Qdrant collection name (defaults to "midjourneysample")
2. **Provider**: Choose between OpenAI or Gemini for LLM processing
3. **Ask Questions**: Type natural language questions about your data

### Example Questions

- "How many artists are in this collection?"
- "Find me images by Chris Dyer"
- "List all artists"
- "Describe this collection"

## Architecture

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **shadcn/ui**: Beautiful, accessible components
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Beautiful icons

## API Integration

The frontend communicates with the Yearn backend via REST API:

- `POST /ask` - Send natural language queries
- `GET /health` - Check backend status

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

The frontend can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Docker**

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend API.
