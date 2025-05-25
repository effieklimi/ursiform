# Yearn Backend

A complete backend service built with Fastify, TypeScript, and Qdrant vector database for semantic search and vector operations.

## Project Structure

```
yearn/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── schemas.ts               # Zod schemas & TypeScript types
│   ├── qdrant/
│   │   ├── db.ts               # Qdrant client initialization & collection management
│   │   ├── embedder.ts         # OpenAI & Gemini embeddings integration
│   │   ├── translator.ts       # Translation and semantic search logic
│   │   └── nlp-query.ts        # Natural language query processing
│   └── routes/
│       ├── collections.ts      # Collection management endpoints
│       ├── vectors.ts          # Vector upsert endpoints
│       ├── documents.ts        # Document ingestion endpoints
│       ├── translate.ts        # Translation/search endpoints
│       ├── nl-query.ts         # Natural language query endpoints
│       └── health.ts           # Health check endpoint
├── tests/backend/
│   ├── test_db.test.ts         # Database layer tests
│   ├── test_embedder.test.ts   # Embedder tests
│   ├── test_translator.test.ts # Translation logic tests
│   └── test_routes.test.ts     # API endpoint tests
├── docker-compose.yml          # Docker services configuration (local Qdrant)
├── docker-compose.cloud.yml    # Docker configuration for cloud Qdrant
├── Dockerfile                  # Backend container configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Test configuration
├── Makefile                   # Build and deployment commands
└── env.example                # Environment variables template
```

## Features

- **Fastify + TypeScript**: High-performance web framework with type safety
- **Qdrant Integration**: Vector database for similarity search (local or cloud)
- **Multiple Embedding Providers**: Support for OpenAI (`text-embedding-ada-002`) and Google Gemini (`embedding-001`)
- **Natural Language Queries**: Ask questions in plain English about your collections 🆕
- **RESTful API**: Clean endpoints for collection and vector management
- **Semantic Search**: Translate natural language queries to vector searches
- **Docker Support**: Containerized deployment with docker-compose
- **Comprehensive Testing**: Unit tests with Jest and mocking
- **Input Validation**: Zod schemas for request/response validation
- **Cloud Ready**: Supports both local and cloud-hosted Qdrant instances

## Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for local setup) - **Optional for cloud usage**
- OpenAI API key
- Qdrant instance (local or cloud)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Environment setup:**

```bash
cp env.example .env
```

#### For Local Qdrant (Docker)

Edit `.env` file:

```bash
QDRANT_URL=http://qdrant:6333
# QDRANT_API_KEY not needed for local
OPENAI_API_KEY=<your-openai-key>
GEMINI_API_KEY=<your-google-gemini-key>
```

#### For Cloud Qdrant (Qdrant Cloud, AWS, etc.)

Edit `.env` file:

```bash
QDRANT_URL=https://your-cluster-url.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=<your-qdrant-api-key>
OPENAI_API_KEY=<your-openai-key>
GEMINI_API_KEY=<your-google-gemini-key>
```

## Commands

### Cloud Development (No Docker Required) ⭐ **RECOMMENDED**

```bash
# Install dependencies
npm install

# Start backend for cloud Qdrant (production build)
npm run up-cloud-local

# OR start in development mode (with hot reload)
npm run dev-cloud

# OR use make commands
make up-cloud-local
make dev-cloud
```

### Local Development (with Docker Qdrant)

```bash
# Install dependencies
make install

# Start services with local Qdrant (requires Docker)
make up

# Clean up local services
make clean
```

### Docker Cloud Development (requires Docker)

```bash
# Start backend container connected to cloud Qdrant
make up-cloud

# Clean up cloud setup
make clean-cloud
```

### Common Commands

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Development server (local)
npm run dev
```

## API Endpoints

All endpoints work the same regardless of whether you use local or cloud Qdrant:

### Health Check

```bash
curl -X GET http://localhost:8000/health
```

Response: `{"status":"ok"}`

### Create Collection

```bash
curl -X POST http://localhost:8000/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_collection",
    "dimension": 768
  }'
```

Response: `{"success":true}`

### Add Document (Automatic Embedding) ⭐ **RECOMMENDED**

Add a single document with automatic embedding generation:

```bash
# Using OpenAI embeddings (default)
curl -X POST http://localhost:8000/collections/my_collection/documents \
  -H "Content-Type: application/json" \
  -d '{
    "document": {
      "id": "doc-1",
      "text": "This is a comprehensive guide to machine learning algorithms and their applications in modern AI systems.",
      "metadata": {
        "title": "ML Guide",
        "category": "education",
        "author": "Jane Doe",
        "tags": ["machine learning", "AI", "algorithms"]
      }
    },
    "provider": "openai"
  }'

# Using Google Gemini embeddings
curl -X POST http://localhost:8000/collections/my_collection/documents \
  -H "Content-Type: application/json" \
  -d '{
    "document": {
      "id": "doc-2",
      "text": "Advanced neural network architectures for natural language processing.",
      "metadata": {
        "title": "NLP Guide",
        "category": "research"
      }
    },
    "provider": "gemini"
  }'
```

**Note**:

- OpenAI embeddings have 1536 dimensions (create collection with `"dimension": 1536`)
- Gemini embeddings have 768 dimensions (create collection with `"dimension": 768`)
- Provider defaults to `"openai"` if not specified

### Bulk Add Documents (Automatic Embedding)

Add multiple documents with automatic embedding generation:

```bash
curl -X POST http://localhost:8000/collections/my_collection/documents/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "id": "doc-1",
        "text": "Introduction to artificial intelligence and machine learning concepts.",
        "metadata": {
          "category": "AI",
          "level": "beginner"
        }
      },
      {
        "id": "doc-2",
        "text": "Advanced deep learning techniques for computer vision applications.",
        "metadata": {
          "category": "Deep Learning",
          "level": "advanced"
        }
      }
    ],
    "provider": "openai"
  }'
```

Response:

```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    { "id": "doc-1", "success": true },
    { "id": "doc-2", "success": true }
  ]
}
```

### Upsert Vectors (Manual Vectors)

For advanced users who want to provide pre-computed vectors:

```bash
curl -X POST http://localhost:8000/collections/my_collection/vectors \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": "doc-1",
        "vector": [0.1, 0.2, 0.3, 0.4, 0.5],
        "payload": {
          "title": "Sample Document",
          "category": "example"
        }
      }
    ]
  }'
```

Response: `{"upserted":1}`

### Translate and Search

```bash
curl -X POST http://localhost:8000/translate-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find documents about machine learning",
    "filters": {
      "category": "research"
    },
    "k": 5,
    "provider": "openai"
  }'
```

Response:

```json
[
  {
    "id": "doc-1",
    "score": 0.95,
    "payload": {
      "title": "Machine Learning Basics",
      "category": "research"
    }
  }
]
```

### Natural Language Queries 🆕

Ask questions about your collections in plain English! The system uses LLMs to understand your intent and translate it into appropriate Qdrant operations.

#### Ask Questions

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "midjourneysample",
    "question": "How many artists are in this collection?",
    "provider": "openai"
  }'
```

Response:

```json
{
  "question": "How many artists are in this collection?",
  "answer": "I found 1000 unique artists in the collection. Some of them include: Chris Dyer, Catherine Hyde, Xavier Dolan, Peter Paul Rubens, Robert Crumb.",
  "query_type": "count",
  "data": {
    "count": 1000,
    "artists": ["Chris Dyer", "Catherine Hyde", "Xavier Dolan", "..."]
  },
  "execution_time_ms": 1250
}
```

#### Supported Query Types

**Count Queries:**

```bash
# Count total items
"How many total images?"
"Count all documents"

# Count unique values
"How many artists are there?"
"Count unique categories"
```

**Search Queries:**

```bash
# Find specific items
"Find me images by Chris Dyer"
"Search for documents about machine learning"
"Show me artwork from Catherine Hyde"
```

**List Queries:**

```bash
# List unique values
"List all artists"
"Show me all categories"
"What artists are in this collection?"
```

**Describe Queries:**

```bash
# Get collection overview
"Describe this collection"
"Tell me about this dataset"
"What's in this collection?"
```

#### Example Conversations

**Artist Search:**

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "midjourneysample",
    "question": "Find me images by Chris Dyer"
  }'
```

Response: `"I found 1 images matching your criteria."`

**Collection Overview:**

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "midjourneysample",
    "question": "Describe this collection"
  }'
```

Response: `"This collection contains 5417 images from 1000 unique artists. Some featured artists include: Chris Dyer, Catherine Hyde, Xavier Dolan, Peter Paul Rubens, Robert Crumb."`

#### Fallback Mode

The system works even without LLM API keys by using pattern matching:

- Recognizes keywords like "how many", "find", "list", "describe"
- Extracts artist names from queries like "Find images by [Artist Name]"
- Provides structured responses based on query patterns

## Default Values

- **Collection name**: `my_collection`
- **Vector dimension**: `768` (Gemini) or `1536` (OpenAI)
- **Search limit (k)**: `5`
- **Embedding provider**: `openai`
- **OpenAI model**: `text-embedding-ada-002` (1536 dimensions)
- **Gemini model**: `embedding-001` (768 dimensions)
- **Vector distance**: `Cosine`

## Environment Variables

| Variable         | Description                   | Default                 | Required |
| ---------------- | ----------------------------- | ----------------------- | -------- |
| `QDRANT_URL`     | Qdrant database URL           | `http://localhost:6333` | Yes      |
| `QDRANT_API_KEY` | Qdrant API key (cloud only)   | None                    | Cloud    |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | None                    | Yes      |
| `GEMINI_API_KEY` | Google Gemini API key         | None                    | Optional |
| `PORT`           | Server port                   | `8000`                  | No       |
| `HOST`           | Server host                   | `0.0.0.0`               | No       |

### Qdrant Setup Options

#### Option 1: Cloud Qdrant (Recommended) ⭐

- **No Docker required**
- Set `QDRANT_URL` to your cloud cluster URL
- Set `QDRANT_API_KEY` to your API key
- Run with `npm run up-cloud-local` or `make up-cloud-local`

#### Option 2: Local Qdrant (Development)

- **Requires Docker**
- Use `docker-compose.yml`
- Set `QDRANT_URL=http://qdrant:6333`
- No API key needed
- Run with `make up`

## Testing

The project includes comprehensive tests for all components:

```bash
# Run all tests
npm test

# Run specific test file
npm test test_db

# Run tests with coverage
npm test -- --coverage
```

## Troubleshooting

### Docker Issues

If you get `docker-compose: command not found`:

- **For cloud Qdrant**: Use `npm run up-cloud-local` instead (no Docker needed)
- **For local development**: Install Docker Desktop or use cloud Qdrant

### Validation Errors

The server uses Zod for validation. Check the error details in the response for specific validation issues.

### Connection Issues

- **Cloud Qdrant**: Verify your `QDRANT_URL` and `QDRANT_API_KEY` are correct
- **Local Qdrant**: Ensure Docker is running and Qdrant container is healthy

## Architecture

### Data Flow

1. **Text Input** → **OpenAI/Gemini Embeddings** → **Vector Representation**
2. **Vector + Metadata** → **Qdrant Database** → **Storage**
3. **Search Query** → **Embedding** → **Vector Search** → **Ranked Results**

### Key Components

- **Database Layer** (`qdrant/db.ts`): Manages Qdrant client and collections (supports both local and cloud)
- **Embedder** (`qdrant/embedder.ts`): Converts text to vectors using OpenAI or Gemini
- **Translator** (`qdrant/translator.ts`): Orchestrates embedding + search
- **Routes**: RESTful API endpoints with validation
- **Schemas**: Type-safe request/response validation with Zod

## Production Deployment

### Cloud Qdrant (Recommended)

```bash
npm run build
npm start
```

### Local Qdrant

```bash
make build
docker-compose up -d
```

### Scale Services

```bash
docker-compose up -d --scale backend=3
```

## License

Open source - feel free to use and modify as needed.
