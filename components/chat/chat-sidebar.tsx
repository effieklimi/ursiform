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
      {/* Header with New Chat Button */}
      <div className="p-4 border-b">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat List - Most Prominent */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-medium text-foreground">Recent Chats</h3>
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

      {/* Secondary Sections - Compact */}
    </div>
  );
}
