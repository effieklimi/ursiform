# Yearn

A natural language interface for vector databases. Works on the browser. Query your data in plain English and get context-aware, conversational answers.

## Features

- _Natural Language Queries_: Ask questions about your data using everyday language.
- _Conversational Context_: The system remembers previous queries for follow-ups.
- _Multiple AI Models_: Supports OpenAI GPT and Google Gemini.
- _Flexible Schema_: Works with any vector database schema.
- _Markdown Rendering_: Answers are formatted for easy reading.
- _Modern UI_: Clean, full-screen interface.

### Environment Variables

Set these in your .env file (see `env.example`):

```bash
QDRANT_URL=...
QDRANT_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

For custom data schemas, you can optionally set:

```bash
ENTITY_FIELD=         # Main entity field (default: "name")
ENTITY_TYPE=          # Plural label for entities (default: "entities")
ITEM_TYPE=            # Label for individual items (default: "items")
FILENAME_FIELD=       # Field for file names (default: "file_name")
URL_FIELD=            # Field for URLs (default: "item_url")
DESCRIPTION_FIELD=    # Field for descriptions (default: "description")
```

### Example Configurations

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

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/effieklimi/yearn.git
   cd yearn
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your API keys and database details
   # Set up Qdrant connection details
   # Optional: Configure field mappings for your data schema as described above
   ```

4. **Run the development server**
   ```bash
   npm run dev
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
- **Backend**: Next.js API routes
- **Vector Database**: Qdrant
- **AI**: OpenAI GPT and Google Gemini
-

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
