"use client";

import { Bot, Database, MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConversationContext } from "@/lib/types";
import { Chat } from "@prisma/client";

interface DynamicExamples {
  database: string[];
  collection: string[];
}

interface ChatSidebarProps {
  selectedCollection: string;
  setSelectedCollection: (value: string) => void;
  collections: string[];
  conversationContext: ConversationContext;
  setConversationContext: (context: ConversationContext) => void;
  demoExamples: DynamicExamples;
  handleExampleClick: (example: string) => void;
  // Chat management props
  chats: Chat[];
  currentChatId: string | null;
  onChatSwitch: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  selectedCollection,
  setSelectedCollection,
  collections,
  conversationContext,
  setConversationContext,
  demoExamples,
  handleExampleClick,
  chats,
  currentChatId,
  onChatSwitch,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div className="w-80 flex-shrink-0 border-r bg-background flex flex-col h-full">
      {/* Chat List - Most Prominent */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Recent Chats</h3>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No chats yet</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Start a new conversation
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onChatSwitch(chat.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors group ${
                    currentChatId === chat.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate mb-1">
                        {chat.title || "Untitled Chat"}
                      </div>
                      {/* Tags as badges */}
                      {(chat as any).parsedTags &&
                        (chat as any).parsedTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(chat as any).parsedTags.map(
                              (tag: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0.5 h-auto bg-muted/60 text-muted-foreground hover:bg-muted/80"
                                >
                                  {tag}
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(chat.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* <div className="border-t bg-muted/30">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-3 h-3 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">
                Collection (Optional)
              </label>
            </div>
            <Select
              value={selectedCollection || "database-level"}
              onValueChange={(value: string) =>
                setSelectedCollection(value === "database-level" ? "" : value)
              }
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Database-level query" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="database-level">
                  Database-level query
                </SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection} value={collection}>
                    {collection}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(conversationContext.lastEntity ||
            conversationContext.lastCollection ||
            conversationContext.conversationHistory.length > 0) && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <label className="text-xs font-medium text-muted-foreground">
                  Active Context
                </label>
              </div>
              <div className="space-y-1">
                {conversationContext.lastEntity && (
                  <div className="text-xs bg-background rounded px-2 py-1 border">
                    <span className="text-muted-foreground">Entity:</span>{" "}
                    <span className="text-foreground font-medium">
                      {conversationContext.lastEntity}
                    </span>
                  </div>
                )}
                {conversationContext.lastCollection && (
                  <div className="text-xs bg-background rounded px-2 py-1 border">
                    <span className="text-muted-foreground">Collection:</span>{" "}
                    <span className="text-foreground font-medium">
                      {conversationContext.lastCollection}
                    </span>
                  </div>
                )}
                {conversationContext.conversationHistory.length > 0 && (
                  <div className="text-xs bg-background rounded px-2 py-1 border">
                    <span className="text-muted-foreground">History:</span>{" "}
                    <span className="text-foreground font-medium">
                      {conversationContext.conversationHistory.length} turns
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  setConversationContext({ conversationHistory: [] })
                }
                className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
              >
                Clear Context
              </button>
            </div>
          )}
        </div>

        <details className="group">
          <summary className="px-4 py-2 cursor-pointer border-t hover:bg-muted/50 transition-colors [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Example Queries
              </span>
              <div className="ml-auto text-muted-foreground group-open:rotate-90 transition-transform">
                ▶
              </div>
            </div>
          </summary>
          <div className="px-4 pb-4 space-y-3 max-h-40 overflow-y-auto">
            <div>
              <div className="text-xs font-medium mb-1 text-muted-foreground">
                Database-level:
              </div>
              <div className="space-y-1">
                {demoExamples.database.slice(0, 2).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs text-left w-full p-2 bg-background hover:bg-accent/50 rounded border transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium mb-1 text-muted-foreground">
                Collection-specific:
              </div>
              <div className="space-y-1">
                {demoExamples.collection.slice(0, 2).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs text-left w-full p-2 bg-background hover:bg-accent/50 rounded border transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium mb-1 text-muted-foreground">
                Conversational:
              </div>
              <div className="space-y-1">
                <button
                  onClick={() =>
                    handleExampleClick("Show me Chris Dyer's work")
                  }
                  className="text-xs text-left w-full p-2 bg-background hover:bg-accent/50 rounded border transition-colors"
                >
                  Show me Chris Dyer's work
                </button>
                <button
                  onClick={() =>
                    handleExampleClick("How many items do they have?")
                  }
                  className="text-xs text-left w-full p-2 bg-background hover:bg-accent/50 rounded border transition-colors"
                >
                  How many items do they have?
                  <span className="text-muted-foreground ml-1">
                    (follow-up)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </details>

        {(conversationContext.lastEntity ||
          conversationContext.lastCollection ||
          conversationContext.conversationHistory.length > 0) && (
          <details className="group border-t">
            <summary className="px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs">🧠</span>
                <span className="text-xs font-medium text-muted-foreground">
                  Debug Context
                </span>
                <div className="ml-auto text-muted-foreground group-open:rotate-90 transition-transform">
                  ▶
                </div>
              </div>
            </summary>
            <div className="px-4 pb-4 space-y-2 max-h-32 overflow-y-auto">
              {conversationContext.lastEntity && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Entity:</span>{" "}
                  <span className="font-mono bg-muted px-1 rounded">
                    {conversationContext.lastEntity}
                  </span>
                </div>
              )}
              {conversationContext.lastCollection && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Collection:</span>{" "}
                  <span className="font-mono bg-muted px-1 rounded">
                    {conversationContext.lastCollection}
                  </span>
                </div>
              )}
              <div className="text-xs">
                <span className="text-muted-foreground">History:</span>{" "}
                <span className="font-mono bg-muted px-1 rounded">
                  {conversationContext.conversationHistory.length} turns
                </span>
              </div>
            </div>
          </details>
        )}
      </div> */}
    </div>
  );
}
