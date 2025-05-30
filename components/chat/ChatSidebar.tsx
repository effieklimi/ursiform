"use client";

import { Bot, Database } from "lucide-react";
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
}

export function ChatSidebar({
  selectedCollection,
  setSelectedCollection,
  collections,
  conversationContext,
  setConversationContext,
  demoExamples,
  handleExampleClick,
}: ChatSidebarProps) {
  return (
    <div className="w-80 flex-shrink-0 border-r bg-background overflow-y-auto">
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="w-4 h-4" />
              Query Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
                Collection (Optional)
              </label>
              <Select
                value={selectedCollection || "database-level"}
                onValueChange={(value: string) =>
                  setSelectedCollection(value === "database-level" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
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

            {/* Conversation Context Indicator */}
            {(conversationContext.lastEntity ||
              conversationContext.lastCollection ||
              conversationContext.conversationHistory.length > 0) && (
              <div className="border-t pt-3">
                <label className="text-xs font-medium mb-2 block text-muted-foreground">
                  Conversation Context
                </label>
                <div className="space-y-1">
                  {conversationContext.lastEntity && (
                    <div className="text-xs bg-accent rounded px-2 py-1 border">
                      <span className="text-accent-foreground">Entity:</span>{" "}
                      <span className="text-foreground">
                        {conversationContext.lastEntity}
                      </span>
                    </div>
                  )}
                  {conversationContext.lastCollection && (
                    <div className="text-xs bg-accent rounded px-2 py-1 border">
                      <span className="text-accent-foreground">
                        Collection:
                      </span>{" "}
                      <span className="text-foreground">
                        {conversationContext.lastCollection}
                      </span>
                    </div>
                  )}
                  {conversationContext.conversationHistory.length > 0 && (
                    <div className="text-xs bg-muted rounded px-2 py-1 border">
                      <span className="text-muted-foreground">History:</span>{" "}
                      <span className="text-foreground">
                        {conversationContext.conversationHistory.length} turns
                      </span>
                    </div>
                  )}
                  {conversationContext.currentTopic && (
                    <div className="text-xs bg-accent rounded px-2 py-1 border">
                      <span className="text-accent-foreground">Topic:</span>{" "}
                      <span className="text-foreground">
                        {conversationContext.currentTopic}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4" />
              Example Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs font-medium mb-1 text-muted-foreground">
                Database-level:
              </div>
              <div className="space-y-1">
                {demoExamples.database.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs text-left w-full p-2 bg-accent hover:bg-accent/80 rounded border transition-colors"
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
                {demoExamples.collection.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs text-left w-full p-2 bg-accent hover:bg-accent/80 rounded border transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Examples */}
            <div>
              <div className="text-xs font-medium mb-1 text-muted-foreground">
                Conversational:
              </div>
              <div className="space-y-1">
                <button
                  onClick={() =>
                    handleExampleClick("Show me Chris Dyer's work")
                  }
                  className="text-xs text-left w-full p-2 bg-accent hover:bg-accent/80 rounded border transition-colors"
                >
                  Show me Chris Dyer's work
                </button>
                <button
                  onClick={() =>
                    handleExampleClick("How many items do they have?")
                  }
                  className="text-xs text-left w-full p-2 bg-accent hover:bg-accent/80 rounded border transition-colors"
                >
                  How many items do they have?
                  <span className="text-muted-foreground ml-1">
                    (after asking about an artist)
                  </span>
                </button>
                <button
                  onClick={() => handleExampleClick("What about Alice?")}
                  className="text-xs text-left w-full p-2 bg-accent hover:bg-accent/80 rounded border transition-colors"
                >
                  What about Alice?
                  <span className="text-muted-foreground ml-1">
                    (continuing conversation)
                  </span>
                </button>
                <button
                  onClick={() =>
                    handleExampleClick("Also show me their latest work")
                  }
                  className="text-xs text-left w-full p-2 bg-accent hover:bg-accent/80 rounded border transition-colors"
                >
                  Also show me their latest work
                  <span className="text-muted-foreground ml-1">
                    (using pronoun reference)
                  </span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Panel */}
        {(conversationContext.lastEntity ||
          conversationContext.lastCollection ||
          conversationContext.conversationHistory.length > 0) && (
          <Card className="border-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive text-sm">
                🧠 Debug: Conversation Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversationContext.lastEntity && (
                <div className="text-xs">
                  <span className="text-destructive">Last Entity:</span>{" "}
                  <span className="text-foreground font-mono bg-muted px-1 rounded">
                    {conversationContext.lastEntity}
                  </span>
                </div>
              )}
              {conversationContext.lastCollection && (
                <div className="text-xs">
                  <span className="text-destructive">Last Collection:</span>{" "}
                  <span className="text-foreground font-mono bg-muted px-1 rounded">
                    {conversationContext.lastCollection}
                  </span>
                </div>
              )}
              {conversationContext.lastQueryType && (
                <div className="text-xs">
                  <span className="text-destructive">Last Query:</span>{" "}
                  <span className="text-foreground font-mono bg-muted px-1 rounded">
                    {conversationContext.lastQueryType}{" "}
                    {conversationContext.lastTarget}
                  </span>
                </div>
              )}
              {conversationContext.currentTopic && (
                <div className="text-xs">
                  <span className="text-destructive">Current Topic:</span>{" "}
                  <span className="text-foreground font-mono bg-muted px-1 rounded">
                    {conversationContext.currentTopic}
                  </span>
                </div>
              )}
              <div className="text-xs">
                <span className="text-destructive">History:</span>{" "}
                <span className="text-foreground font-mono bg-muted px-1 rounded">
                  {conversationContext.conversationHistory.length} turns
                </span>
              </div>
              <button
                onClick={() =>
                  setConversationContext({ conversationHistory: [] })
                }
                className="text-xs text-destructive hover:text-foreground mt-2 underline"
              >
                Clear Context
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
