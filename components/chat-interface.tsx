"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { askQuestion } from "@/lib/api";
import { ChatMessage, NaturalQueryRequest } from "@/lib/types";
import { Send, Bot, User, Clock, Database } from "lucide-react";

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [collection, setCollection] = useState("midjourneysample");
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const request: NaturalQueryRequest = {
        collection,
        question: input.trim(),
        provider,
      };

      const response = await askQuestion(request);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.answer,
        timestamp: new Date(),
        queryType: response.query_type,
        executionTime: response.execution_time_ms,
        data: response.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatData = (data: unknown) => {
    if (!data) return null;

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;

      if ("count" in obj && typeof obj.count === "number") {
        return (
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4" />
              <span className="font-medium">Query Results</span>
            </div>
            <div className="text-sm space-y-1">
              <div>
                Count: <span className="font-mono">{obj.count}</span>
              </div>
              {obj.artists && Array.isArray(obj.artists) && (
                <div>
                  Sample: {(obj.artists as string[]).slice(0, 3).join(", ")}
                  {(obj.artists as string[]).length > 3 && "..."}
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Natural Language Query Interface
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Collection:</label>
              <Input
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="w-40 h-8"
                placeholder="Collection name"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Provider:</label>
              <select
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as "openai" | "gemini")
                }
                className="h-8 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                Ask me anything about your collection!
              </h3>
              <p className="text-sm">
                Try questions like "How many artists are there?" or "Find images
                by Chris Dyer"
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  message.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {message.type === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`rounded-lg p-3 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-sm">{message.content}</div>

                  {message.type === "assistant" && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.queryType && (
                        <Badge variant="secondary" className="text-xs">
                          {message.queryType}
                        </Badge>
                      )}
                      {message.executionTime && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {message.executionTime}ms
                        </Badge>
                      )}
                    </div>
                  )}

                  {message.type === "assistant" && formatData(message.data)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your collection..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-xs text-muted-foreground mt-2">
            Try: "How many artists?", "Find images by Chris Dyer", "Describe
            this collection"
          </div>
        </div>
      </Card>
    </div>
  );
}
