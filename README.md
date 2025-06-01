# <img src="public/ursiform.png" alt="Ursiform" width="26" height="26" style="display: inline-block; vertical-align: middle; margin-right: 8px; filter: brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(1) contrast(1);" /> Ursiform

A natural language interface for vector databases. Works on the browser. Query your data in plain English and get context-aware, conversational answers.

## Features

- _Natural Language Queries_: Ask questions about your data using everyday language.
- _Conversational Context_: The system remembers previous queries for follow-ups.
- _Multiple AI Models_: Supports OpenAI GPT and Google Gemini.
- _Flexible Schema_: Works with any vector database schema.
- _Markdown Rendering_: Answers are formatted for easy reading.
- _Modern UI_: Clean, full-screen interface.
- _Robust Configuration_: Comprehensive validation with helpful error messages.

## Quick Start

1. **Clone & Install**

   ```bash
   git clone https://github.com/effieklimi/ursiform.git
   cd ursiform
   npm install
   ```

2. **Configure Environment**

   ```bash
   cp env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Set Required Variables**
   At minimum, you need one embedding provider:

   ```bash
   # Option 1: OpenAI (recommended)
   OPENAI_API_KEY=sk-your-actual-key

   # Option 2: Google Gemini
   GEMINI_API_KEY=your-actual-key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Configuration

Ursiform uses a robust configuration system with **automatic validation** and **helpful error messages**. The app will fail fast with clear guidance if required variables are missing.

### Required Configuration

| Variable         | Description                   | Default | Required       |
| ---------------- | ----------------------------- | ------- | -------------- |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | -       | ⭐ (or Gemini) |
| `GEMINI_API_KEY` | Google Gemini API key         | -       | ⭐ (or OpenAI) |

### Vector Database Configuration

| Variable                    | Description                 | Default                 | Required        |
| --------------------------- | --------------------------- | ----------------------- | --------------- |
| `QDRANT_URL`                | Qdrant database URL         | `http://localhost:6333` | ✅              |
| `QDRANT_API_KEY`            | Qdrant API key (cloud only) | -                       | 🏗️ (production) |
| `QDRANT_DEFAULT_COLLECTION` | Default collection name     | `vectors`               | ❌              |
| `QDRANT_MAX_RETRIES`        | Connection retry attempts   | `3`                     | ❌              |
| `QDRANT_TIMEOUT`            | Connection timeout (ms)     | `30000`                 | ❌              |

### Optional Configuration

| Variable                 | Description            | Default                  |
| ------------------------ | ---------------------- | ------------------------ |
| `NODE_ENV`               | Environment mode       | `development`            |
| `LOG_LEVEL`              | Logging level          | `info`                   |
| `PORT`                   | Server port            | `3000`                   |
| `OPENAI_EMBEDDING_MODEL` | OpenAI embedding model | `text-embedding-ada-002` |
| `OPENAI_MAX_TOKENS`      | OpenAI token limit     | `8191`                   |
| `GEMINI_MODEL`           | Gemini embedding model | `text-embedding-004`     |
| `DATABASE_URL`           | SQLite/PostgreSQL URL  | `file:./prisma/dev.db`   |

### Configuration Examples

#### Local Development

```bash
# .env.local
OPENAI_API_KEY=sk-your-key
QDRANT_URL=http://localhost:6333
```

#### Production with Qdrant Cloud

```bash
# .env.local
OPENAI_API_KEY=sk-your-key
QDRANT_URL=https://your-cluster.region.gcp.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
NODE_ENV=production
```

#### Custom Collection and Providers

```bash
OPENAI_API_KEY=sk-your-key
GEMINI_API_KEY=your-gemini-key
QDRANT_DEFAULT_COLLECTION=my_documents
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Configuration Validation

The app automatically validates your configuration on startup:

✅ **Startup Success:**

```
🔧 Loading application configuration...
✅ Configuration loaded successfully
📍 Environment: development
🗄️  Qdrant URL: http://localhost:6333
🔑 Embedding providers: openai
📦 Default collection: vectors
```

❌ **Configuration Errors:**

```
❌ Configuration validation failed:
  • embeddings: At least one embedding provider must be configured
    💡 Set environment variable: OPENAI_API_KEY
  • qdrant.url: Invalid url
    💡 Set environment variable: QDRANT_URL

📖 See .env.example for required environment variables
```

### Health Check

Check your configuration anytime:

```bash
curl http://localhost:3000/api/health
```

Response includes service status, available providers, and configuration validation.

## Schema Configuration

For custom data schemas, you can optionally set:

```bash
ENTITY_FIELD=         # Main entity field (default: "name")
ENTITY_TYPE=          # Plural label for entities (default: "entities")
ITEM_TYPE=            # Label for individual items (default: "items")
FILENAME_FIELD=       # Field for file names (default: "file_name")
URL_FIELD=            # Field for URLs (default: "item_url")
DESCRIPTION_FIELD=    # Field for descriptions (default: "description")
```

### Example Schema Configurations

#### For Document Collections:

```bash
ENTITY_FIELD=author
ENTITY_TYPE=authors
ITEM_TYPE=documents
FILENAME_FIELD=document_name
URL_FIELD=document_url
DESCRIPTION_FIELD=summary
```

#### For Product Catalogs:

```bash
ENTITY_FIELD=brand
ENTITY_TYPE=brands
ITEM_TYPE=products
FILENAME_FIELD=product_image
URL_FIELD=product_url
DESCRIPTION_FIELD=product_description
```

#### For Research Papers:

```bash
ENTITY_FIELD=author
ENTITY_TYPE=researchers
ITEM_TYPE=papers
FILENAME_FIELD=paper_title
URL_FIELD=paper_url
DESCRIPTION_FIELD=abstract
```

## Usage

### Basic Queries

- Ask questions like:
  - "How many [entities] are in my database?"
  - "List some [entities] from [collection]"
  - "Find [items] by [entity name]"
  - "Which [entity] has the most [items]?"
  - "Show me the top 5 [entities] by [item] count"
  - "Describe my database"
- The system supports follow-up and context-aware queries.

## API Endpoints

### POST /api/ask

Query the vector database using natural language.

**Request:**

```json
{
  "question": "Your question here",
  "collection": "optional_collection_name",
  "model": "gpt-4o-mini",
  "context": {
    "conversationHistory": [],
    "lastEntity": "optional_last_entity",
    "lastCollection": "optional_last_collection"
  }
}
```

**Response:**

```json
{
  "answer": "I found 1,247 unique artists in your collection...",
  "query_type": "count",
  "data": { "count": 1247, "artists": ["Artist 1", "Artist 2", ...] },
  "execution_time_ms": 1250,
  "context": { "conversationHistory": [...], "lastEntity": "...", ... }
}
```

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
  - **App Directory**: `/app` - Next.js app router (pages, layouts, API routes)
  - **Components**: `/frontend/components` - Reusable React components
  - **Styles**: `/frontend/styles` - Global CSS and styling
- **Backend**: Next.js API routes and server logic (organized in `/backend` directory)
- **Vector Database**: Qdrant
- **AI**: OpenAI GPT and Google Gemini

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ in London.**

## TRPC Setup (App Directory)

This project uses TRPC with Next.js App Directory (not Pages directory). The TRPC setup includes:

### Server Setup

- **Route Handler**: `app/api/trpc/[trpc]/route.ts` - Handles all TRPC requests using the fetch adapter
- **Context**: `lib/trpc.ts` - Provides both Pages and App directory context functions
- **Routers**: `lib/routers/` - Contains all TRPC procedure definitions

### Client Setup

- **Provider**: `frontend/components/providers/trpc-provider.tsx` - TRPC React Query provider
- **Layout**: App directory layout automatically includes the TRPC provider

### Testing TRPC

1. Start the development server: `npm run dev`
2. Visit `/test-trpc` to test the TRPC integration
3. Or run the test script: `node test-trpc-endpoint.js`

### Migration from Pages Directory

The TRPC setup has been migrated from Pages directory (`pages/api/trpc/`) to App directory (`app/api/trpc/[trpc]/`). The old pages directory handlers have been removed.

### Available Procedures

- `chat.getAll` - Get all chats
- `chat.getById({ id })` - Get specific chat with messages
- `chat.create({ title? })` - Create new chat
- `chat.updateTitle({ id, title })` - Update chat title
- `chat.delete({ id })` - Delete chat
- `chat.getCount` - Get total chat count
- `message.*` - Message-related procedures

## Requirements

- Node.js >= 18.18.0 (Next.js 15 requirement)
- npm or yarn

## Getting Started

// ... existing code ...
