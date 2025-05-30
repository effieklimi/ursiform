# Database Setup

This project uses **Prisma** with **SQLite** for local data persistence of chat messages and conversations.

## Database Configuration

- **Database Type**: SQLite
- **Database File**: `dev.db` (stored at the project root)
- **Schema Location**: `prisma/schema.prisma`
- **Client Location**: `lib/prisma.ts`

## Database Schema

The database contains two main models:

### Chat

- `id`: Unique identifier (CUID)
- `title`: Optional chat title
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `messages`: Related messages

### Message

- `id`: Unique identifier (CUID)
- `chatId`: Reference to parent chat
- `role`: Either "user" or "assistant"
- `content`: Message content
- `createdAt`: Timestamp of creation

## Available Scripts

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (careful: deletes all data)
npm run db:reset
```

## Database Service

Use the `DatabaseService` class in `lib/db.ts` for database operations:

```typescript
import { DatabaseService } from "@/lib/db";

// Create a new chat
const chat = await DatabaseService.createChat("My Chat Title");

// Add a message
await DatabaseService.addMessage(chat.id, "user", "Hello!");

// Get chat with messages
const chatWithMessages = await DatabaseService.getChat(chat.id);
```

## Environment Variables

The database URL is configured in `.env`:

```
DATABASE_URL="file:./dev.db"
```

## Files Structure

```
├── dev.db                 # SQLite database file
├── prisma/
│   └── schema.prisma      # Database schema
├── lib/
│   ├── prisma.ts          # Prisma client instance
│   └── db.ts              # Database service layer
└── .env                   # Environment variables
```
