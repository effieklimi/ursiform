# Yearn - Natural Language Query Interface

A natural language interface for vector databases that allows you to ask questions about your data in plain English.

## Features

- **Natural Language Queries**: Ask questions like "How many artists are in my collection?" or "Show me work by Chris Dyer"
- **Context-Aware Conversations**: The system remembers previous queries and can handle follow-up questions
- **Multiple AI Models**: Support for OpenAI GPT and Google Gemini models
- **Configurable Database Schema**: Works with different types of vector databases beyond just images/artists
- **Real-time Markdown Rendering**: Properly formatted responses with markdown support
- **Full-Screen Interface**: Optimized for productivity with a clean, full-screen layout

## Database Configuration

The system is designed to work with different types of vector databases. You can configure it for your specific use case by setting environment variables:

### Environment Variables

```bash
# Entity Configuration
ENTITY_FIELD=name              # Field containing the main entity identifier (default: "name")
ENTITY_TYPE=artists            # What to call entities in responses (default: "artists")
ITEM_TYPE=images              # What to call individual items (default: "images")

# Additional Fields (optional)
FILENAME_FIELD=file_name      # Field for file names (default: "file_name")
URL_FIELD=image_url          # Field for URLs (default: "image_url")
DESCRIPTION_FIELD=description # Field for descriptions (default: "description")
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
   git clone <repository-url>
   cd yearn
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your API keys and database configuration
   ```

4. **Configure your vector database**

   - Set up Qdrant connection details
   - Configure field mappings for your data schema

5. **Run the development server**
   ```bash
   npm run dev
   ```

## Usage

### Basic Queries

- "How many [entities] are in my database?"
- "List some [entities] from [collection]"
- "Find [items] by [entity name]"
- "Describe my database"

### Advanced Queries

- "Which [entity] has the most [items]?"
- "Show me the top 5 [entities] by [item] count"
- "Analyze [entity name]'s work patterns"

### Conversational Queries

- "Show me Chris Dyer's work" → "How many items do they have?" → "What about Alice?"
- The system maintains context and can resolve pronouns and references

## API Endpoints

### POST /api/ask

Query the vector database using natural language.

**Request:**

```json
{
  "question": "How many artists are in my collection?",
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
- **AI Models**: OpenAI GPT and Google Gemini
- **Natural Language Processing**: Custom intent parsing with LLM fallback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using Next.js, Qdrant, and modern web technologies.**
