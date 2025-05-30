# Database Setup

This project uses **Prisma** with **SQLite** for local data persistence of chat messages and conversations, and **tRPC** for type-safe API communication.

## Database Configuration

- **Database Type**: SQLite
- **Database File**: `dev.db` (stored at the project root)
- **Schema Location**: `prisma/schema.prisma`
- **Client Location**: `lib/prisma.ts`

## tRPC API Layer

The project uses tRPC for type-safe communication between frontend and backend:

- **Server Setup**: `lib/trpc.ts` - Core tRPC configuration
- **Routers**: `lib/routers/` - API route definitions
- **Client Provider**: `components/providers/trpc-provider.tsx` - React provider
- **API Endpoint**: `/api/trpc/[trpc].ts` - Next.js API route

### Available tRPC Endpoints

**Chat Operations:**

- `chat.getAll` - Get all chats
- `chat.getById` - Get chat with messages
- `chat.create` - Create new chat
- `chat.updateTitle` - Update chat title
- `chat.delete` - Delete chat
- `chat.getCount` - Get chat count

**Message Operations:**

- `message.getByChatId` - Get messages for a chat
- `message.add` - Add new message
- `message.delete` - Delete message
- `message.getCount` - Get message count

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

# Validate tRPC types
npm run trpc:build
```

## Using tRPC in Components

```typescript
"use client";
import { trpc } from "@/components/providers/trpc-provider";

export function MyComponent() {
  // Queries
  const { data: chats, isLoading } = trpc.chat.getAll.useQuery();
  const { data: chat } = trpc.chat.getById.useQuery({ id: "chat-id" });

  // Mutations
  const createChat = trpc.chat.create.useMutation();
  const addMessage = trpc.message.add.useMutation();

  const handleCreateChat = async () => {
    await createChat.mutateAsync({ title: "New Chat" });
  };

  const handleAddMessage = async (chatId: string, content: string) => {
    await addMessage.mutateAsync({
      chatId,
      role: "user",
      content,
    });
  };

  return <div>{/* Your component JSX */}</div>;
}
```

## Database Service (Alternative Direct Access)

You can also use the `DatabaseService` class directly in server components or API routes:

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
│   ├── db.ts              # Database service layer
│   ├── trpc.ts            # tRPC configuration
│   └── routers/           # tRPC API routes
│       ├── _app.ts        # Main router
│       ├── chat.ts        # Chat operations
│       └── message.ts      # Message operations
├── pages/api/trpc/
│   └── [trpc].ts          # Next.js API handler
├── components/providers/
│   └── trpc-provider.tsx  # React tRPC provider
├── app/
│   └── layout.tsx         # Root layout with providers
└── .env                   # Environment variables
```

## Testing the Setup

Visit `/chat` to see the tRPC test component in action, which demonstrates:

- Fetching chat and message counts
- Creating new chats
- Real-time data updates
