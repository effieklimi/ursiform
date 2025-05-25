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
│   │   ├── embedder.ts         # OpenAI embeddings integration
│   │   └── translator.ts       # Translation and semantic search logic
│   └── routes/
│       ├── collections.ts      # Collection management endpoints
│       ├── vectors.ts          # Vector upsert endpoints
│       ├── translate.ts        # Translation/search endpoints
│       └── health.ts           # Health check endpoint
├── tests/backend/
│   ├── test_db.ts              # Database layer tests
│   ├── test_embedder.ts        # Embedder tests
│   ├── test_translator.ts      # Translation logic tests
│   └── test_routes.ts          # API endpoint tests
├── docker-compose.yml          # Docker services configuration
├── Dockerfile                  # Backend container configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Test configuration
├── Makefile                   # Build and deployment commands
└── env.example                # Environment variables template
```

## Features

- **Fastify + TypeScript**: High-performance web framework with type safety
- **Qdrant Integration**: Vector database for similarity search
- **OpenAI Embeddings**: Text-to-vector transformation using `text-embedding-ada-002`
- **RESTful API**: Clean endpoints for collection and vector management
- **Semantic Search**: Translate natural language queries to vector searches
- **Docker Support**: Containerized deployment with docker-compose
- **Comprehensive Testing**: Unit tests with Jest and mocking
- **Input Validation**: Zod schemas for request/response validation

## Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- OpenAI API key

### Installation

1. **Clone and install dependencies:**

```bash
yarn install
```

2. **Environment setup:**

```bash
cp env.example .env
```

Edit `.env` file and add your API keys:

```bash
QDRANT_URL=http://qdrant:6333
GEMINI_API_KEY=<your-google-gemini-key>
OPENAI_API_KEY=<your-openai-key>
```

## Commands

### Development

```bash
# Install dependencies
make install

# Start services with Docker Compose
make up

# Run in development mode
make dev

# Build TypeScript and Docker image
make build

# Run tests
make test

# Clean up Docker resources
make clean
```

### NPM Scripts

```bash
# Development server
yarn dev

# Build TypeScript
yarn build

# Start production server
yarn start

# Run tests
yarn test

# Docker compose up
yarn up

# Docker build
yarn docker-build
```

## API Endpoints

### Health Check

```bash
curl -X GET http://localhost:8000/health
```

Response: `{ "status": "ok" }`

### Create Collection

```bash
curl -X POST http://localhost:8000/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_collection",
    "dimension": 768
  }'
```

Response: `{ "success": true }`

### Upsert Vectors

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

Response: `{ "upserted": 1 }`

### Translate and Search

```bash
curl -X POST http://localhost:8000/translate-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find documents about machine learning",
    "filters": {
      "category": "research"
    },
    "k": 5
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

## Default Values

- **Collection name**: `my_collection`
- **Vector dimension**: `768` (matches OpenAI text-embedding-ada-002)
- **Search limit (k)**: `5`
- **Embedding model**: `text-embedding-ada-002`
- **Vector distance**: `Cosine`

## Environment Variables

| Variable         | Description                   | Default              |
| ---------------- | ----------------------------- | -------------------- |
| `QDRANT_URL`     | Qdrant database URL           | `http://qdrant:6333` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Required             |
| `GEMINI_API_KEY` | Google Gemini API key         | Optional             |
| `PORT`           | Server port                   | `8000`               |
| `HOST`           | Server host                   | `0.0.0.0`            |

## Testing

The project includes comprehensive tests for all components:

```bash
# Run all tests
make test

# Run specific test file
yarn test test_db

# Run tests with coverage
yarn test --coverage
```

## Architecture

### Data Flow

1. **Text Input** → **OpenAI Embeddings** → **Vector Representation**
2. **Vector + Metadata** → **Qdrant Database** → **Storage**
3. **Search Query** → **Embedding** → **Vector Search** → **Ranked Results**

### Key Components

- **Database Layer** (`qdrant/db.ts`): Manages Qdrant client and collections
- **Embedder** (`qdrant/embedder.ts`): Converts text to vectors using OpenAI
- **Translator** (`qdrant/translator.ts`): Orchestrates embedding + search
- **Routes**: RESTful API endpoints with validation
- **Schemas**: Type-safe request/response validation with Zod

## Production Deployment

1. **Build the application:**

```bash
make build
```

2. **Deploy with Docker Compose:**

```bash
docker-compose up -d
```

3. **Scale services:**

```bash
docker-compose up -d --scale backend=3
```

## License

Open source - feel free to use and modify as needed.
