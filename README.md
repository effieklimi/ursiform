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
- **OpenAI Embeddings**: Text-to-vector transformation using `text-embedding-ada-002`
- **RESTful API**: Clean endpoints for collection and vector management
- **Semantic Search**: Translate natural language queries to vector searches
- **Docker Support**: Containerized deployment with docker-compose
- **Comprehensive Testing**: Unit tests with Jest and mocking
- **Input Validation**: Zod schemas for request/response validation
- **Cloud Ready**: Supports both local and cloud-hosted Qdrant instances

## Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for local setup)
- OpenAI API key
- Qdrant instance (local or cloud)

### Installation

1. **Clone and install dependencies:**

```bash
yarn install
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

### Local Development (with Docker Qdrant)

```bash
# Install dependencies
make install

# Start services with local Qdrant
make up

# Clean up local services
make clean
```

### Cloud Development (with Cloud Qdrant)

```bash
# Install dependencies
make install

# Start backend only (connects to cloud Qdrant)
make up-cloud

# Clean up cloud setup
make clean-cloud
```

### Common Commands

```bash
# Run in development mode
make dev

# Build TypeScript and Docker image
make build

# Run tests
make test
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

# Docker compose up (local)
yarn up

# Docker compose up (cloud)
yarn up-cloud

# Docker build
yarn docker-build
```

## API Endpoints

All endpoints remain the same regardless of whether you use local or cloud Qdrant:

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

| Variable         | Description                   | Default                 | Required |
| ---------------- | ----------------------------- | ----------------------- | -------- |
| `QDRANT_URL`     | Qdrant database URL           | `http://localhost:6333` | Yes      |
| `QDRANT_API_KEY` | Qdrant API key (cloud only)   | None                    | Cloud    |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | None                    | Yes      |
| `GEMINI_API_KEY` | Google Gemini API key         | None                    | Optional |
| `PORT`           | Server port                   | `8000`                  | No       |
| `HOST`           | Server host                   | `0.0.0.0`               | No       |

### Qdrant Setup Options

#### Option 1: Local Qdrant (Development)

- Use `docker-compose.yml`
- Set `QDRANT_URL=http://qdrant:6333`
- No API key needed
- Run with `make up`

#### Option 2: Cloud Qdrant (Production)

- Use `docker-compose.cloud.yml`
- Set `QDRANT_URL` to your cloud cluster URL
- Set `QDRANT_API_KEY` to your API key
- Run with `make up-cloud`

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

- **Database Layer** (`qdrant/db.ts`): Manages Qdrant client and collections (supports both local and cloud)
- **Embedder** (`qdrant/embedder.ts`): Converts text to vectors using OpenAI
- **Translator** (`qdrant/translator.ts`): Orchestrates embedding + search
- **Routes**: RESTful API endpoints with validation
- **Schemas**: Type-safe request/response validation with Zod

## Production Deployment

### Local Qdrant

```bash
make build
docker-compose up -d
```

### Cloud Qdrant

```bash
make build
docker-compose -f docker-compose.cloud.yml up -d
```

### Scale Services

```bash
docker-compose up -d --scale backend=3
```

## License

Open source - feel free to use and modify as needed.
