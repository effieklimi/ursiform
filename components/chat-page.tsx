"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Clock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SideNavigation } from "@/components/side-navigation";
import { ModeToggle } from "@/components/mode-toggle";
import ReactMarkdown from "react-markdown";
import {
  ChatMessage,
  AVAILABLE_MODELS,
  ConversationContext,
} from "@/lib/types";
import { useAtom } from "jotai";
import {
  selectedModelAtom,
  selectedCollectionAtom,
  conversationContextAtom,
} from "@/lib/atoms";

interface DynamicExamples {
  database: string[];
  collection: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useAtom(
    selectedCollectionAtom
  );
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [collections, setCollections] = useState<string[]>([]);
  const [conversationContext, setConversationContext] = useAtom(
    conversationContextAtom
  );
  const [demoExamples, setDemoExamples] = useState<DynamicExamples>({
    database: [
      "What collections exist in my database?",
      "How many artists are in the database?",
      "Describe my database",
      "How many total vectors are there?",
    ],
    collection: [
      "How many artists are there?",
      "Find images by artists",
      "List all artists",
      "Describe this collection",
    ],
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load collections on mount
  useEffect(() => {
    loadCollectionsAndGenerateExamples();
  }, []);

  const loadCollectionsAndGenerateExamples = async () => {
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What collections exist?",
          model: selectedModel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.collections) {
          const collectionsData = data.data.collections;
          const collectionNames = collectionsData.map((c: any) => c.name);
          setCollections(collectionNames);

          // Generate dynamic examples based on actual data
          await generateDynamicExamples(collectionsData);
        }
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  const generateDynamicExamples = async (collectionsData: any[]) => {
    try {
      // Find collections with data
      const collectionsWithData = collectionsData.filter(
        (c: any) => c.vectors_count > 0
      );
      const largestCollection = collectionsData.reduce(
        (max: any, current: any) =>
          current.vectors_count > max.vectors_count ? current : max
      );

      // Generate database-level examples
      const databaseExamples = [
        "What collections exist in my database?",
        `How many total vectors are across all collections?`,
        "Describe my database overview",
        collectionsData.length > 1
          ? "How many artists are there across all collections?"
          : "How many collections do I have?",
      ];

      // Generate collection-specific examples
      let collectionExamples: string[] = [];

      if (collectionsWithData.length > 0) {
        // Try to get some sample artist data for better examples
        const sampleCollection = largestCollection.name;

        try {
          const artistResponse = await fetch("/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collection: sampleCollection,
              question: "List a few artists",
              model: selectedModel,
            }),
          });

          let sampleArtists: string[] = [];
          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            if (artistData.data?.artists) {
              sampleArtists = artistData.data.artists.slice(0, 2);
            }
          }

          // Create examples with actual collection names and artist names
          collectionExamples = [
            `How many artists in ${sampleCollection}?`,
            `How many vectors are in ${sampleCollection}?`,
            sampleArtists.length > 0
              ? `Find ${sampleArtists[0]} images in ${sampleCollection}`
              : `Find images in ${sampleCollection}`,
            `Describe the ${sampleCollection} collection`,
          ];

          // Add examples for other collections if they exist
          if (collectionsWithData.length > 1) {
            const otherCollection = collectionsWithData.find(
              (c: any) => c.name !== sampleCollection
            );
            if (otherCollection) {
              collectionExamples[1] = `How many artists in ${otherCollection.name}?`;
            }
          }

          // Add cross-collection search if we have artists
          if (sampleArtists.length > 0 && collectionsData.length > 1) {
            collectionExamples.push(
              `Find ${sampleArtists[0]} images across all collections`
            );
          }
        } catch (error) {
          console.warn("Failed to get artist data for examples:", error);
          // Fallback to collection names only
          collectionExamples = [
            `How many artists in ${largestCollection.name}?`,
            `How many vectors are in ${largestCollection.name}?`,
            `List all artists in ${largestCollection.name}`,
            `Describe the ${largestCollection.name} collection`,
          ];
        }
      } else {
        // Fallback if no collections have data
        const firstCollection = collectionsData[0]?.name || "your_collection";
        collectionExamples = [
          `How many artists in ${firstCollection}?`,
          `How many vectors are in ${firstCollection}?`,
          `List all artists in ${firstCollection}`,
          `Describe the ${firstCollection} collection`,
        ];
      }

      setDemoExamples({
        database: databaseExamples.slice(0, 4),
        collection: collectionExamples.slice(0, 4),
      });
    } catch (error) {
      console.error("Failed to generate dynamic examples:", error);
      // Keep default examples if generation fails
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    console.log("🚀 SUBMITTING QUERY:");
    console.log("Question:", inputValue);
    console.log(
      "Current context being sent:",
      JSON.stringify(conversationContext, null, 2)
    );

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
      context: conversationContext,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: selectedCollection || undefined,
          question: inputValue,
          model: selectedModel,
          context: conversationContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📥 RECEIVED RESPONSE:");
      console.log("Response data:", JSON.stringify(data, null, 2));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer,
        timestamp: new Date(),
        queryType: data.query_type,
        executionTime: data.execution_time_ms,
        data: data.data,
        context: data.context,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.context) {
        console.log("📝 UPDATING FRONTEND CONTEXT:");
        console.log("New context:", JSON.stringify(data.context, null, 2));
        setConversationContext(data.context);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error processing your request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInputValue(example);
  };

  const formatData = (data: any, queryType: string) => {
    if (!data) return null;

    // Handle different data types with consistent formatting
    if (queryType === "collections" && data.collections) {
      return (
        <div className="mt-2 space-y-1">
          <div className="text-sm font-medium text-muted-foreground">
            Collections Found:
          </div>
          {data.collections.map((collection: any, index: number) => (
            <div
              key={index}
              className="text-sm bg-muted rounded px-2 py-1 border"
            >
              <span className="font-medium">{collection.name}</span>
              {collection.vectors_count !== undefined && (
                <span className="text-muted-foreground ml-2">
                  ({collection.vectors_count.toLocaleString()} vectors)
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (queryType === "database" && data.collections) {
      return (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-muted-foreground">
              Total Collections:{" "}
              <span className="font-medium text-foreground">
                {data.total_collections}
              </span>
            </div>
            <div className="text-muted-foreground">
              Total Vectors:{" "}
              <span className="font-medium text-foreground">
                {data.total_vectors?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (
      (queryType === "count" || queryType === "describe") &&
      data.count !== undefined
    ) {
      return (
        <div className="mt-2 text-sm">
          <Badge variant="secondary">{data.count.toLocaleString()} items</Badge>
          {data.artist && (
            <div className="mt-1 text-muted-foreground">
              Artist:{" "}
              <span className="text-foreground font-medium">{data.artist}</span>
            </div>
          )}
          {data.by_collection && data.by_collection.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">
                Found in collections:
              </div>
              {data.by_collection.map((col: any, index: number) => (
                <div
                  key={index}
                  className="text-xs bg-muted rounded px-2 py-1 border"
                >
                  <span className="text-foreground">{col.collection}</span>:{" "}
                  <span className="text-muted-foreground">
                    {col.count} images
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.artists && data.artists.length > 0 && (
            <div className="mt-1 text-muted-foreground">
              Artists: {data.artists.slice(0, 5).join(", ")}
              {data.artists.length > 5 && "..."}
            </div>
          )}
        </div>
      );
    }

    if (queryType === "summarize") {
      return (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Summary of {data.artist}'s Work:
          </div>
          <div className="bg-muted rounded p-3 border space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-muted-foreground">
                Total Images:{" "}
                <span className="text-foreground font-medium">
                  {data.total_images || 0}
                </span>
              </div>
              <div className="text-muted-foreground">
                Displayed:{" "}
                <span className="text-foreground font-medium">
                  {data.displayed_images || 0}
                </span>
              </div>
            </div>
            {data.collections_found && (
              <div className="text-xs text-muted-foreground">
                Found in:{" "}
                <span className="text-foreground">
                  {data.collections_found} collections
                </span>
              </div>
            )}
            {data.file_types && data.file_types.length > 0 && (
              <div className="text-xs text-muted-foreground">
                File Types:{" "}
                <span className="text-foreground">
                  {data.file_types.join(", ")}
                </span>
              </div>
            )}
            {data.sample_images && data.sample_images.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Sample Images:
                </div>
                {data.sample_images
                  .slice(0, 3)
                  .map((img: any, index: number) => (
                    <div
                      key={index}
                      className="text-xs bg-card rounded px-2 py-1 border"
                    >
                      <span className="text-primary">{img.filename}</span>
                      {img.collection && (
                        <span className="text-muted-foreground ml-1">
                          ({img.collection})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (queryType === "analyze") {
      return (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Analysis of {data.artist}'s Work:
          </div>
          <div className="bg-muted rounded p-3 border space-y-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Total Images: </span>
              <span className="text-foreground font-medium">
                {data.total_images || 0}
              </span>
            </div>
            {data.file_type_distribution &&
              Object.keys(data.file_type_distribution).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    File Types:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(data.file_type_distribution).map(
                      ([type, count]: [string, any]) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}: {count}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            {data.common_naming_patterns &&
              Object.keys(data.common_naming_patterns).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Common Patterns:
                  </div>
                  {Object.entries(data.common_naming_patterns)
                    .slice(0, 3)
                    .map(([pattern, count]: [string, any]) => (
                      <div
                        key={pattern}
                        className="text-xs text-muted-foreground"
                      >
                        <code className="bg-card px-1 rounded text-primary">
                          "{pattern}"
                        </code>{" "}
                        - {count} files
                      </div>
                    ))}
                </div>
              )}
          </div>
        </div>
      );
    }

    if (queryType === "search" && data.results_by_collection) {
      return (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Search Results ({data.total_count} total):
          </div>
          {data.results_by_collection
            .slice(0, 3)
            .map((result: any, index: number) => (
              <div
                key={index}
                className="text-sm bg-muted rounded px-2 py-1 border"
              >
                <span className="font-medium text-foreground">
                  {result.collection}
                </span>
                :{" "}
                <span className="text-muted-foreground">
                  {result.count} matches
                </span>
              </div>
            ))}
        </div>
      );
    }

    return null;
  };

  return (
    <main className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-full">
        {/* Side Navigation */}
        <SideNavigation currentPage="chat" />

        {/* Chat Interface */}
        <div className="flex h-full w-full">
          {/* Model Selection Panel */}
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
                        setSelectedCollection(
                          value === "database-level" ? "" : value
                        )
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
                            <span className="text-accent-foreground">
                              Entity:
                            </span>{" "}
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
                            <span className="text-muted-foreground">
                              History:
                            </span>{" "}
                            <span className="text-foreground">
                              {conversationContext.conversationHistory.length}{" "}
                              turns
                            </span>
                          </div>
                        )}
                        {conversationContext.currentTopic && (
                          <div className="text-xs bg-accent rounded px-2 py-1 border">
                            <span className="text-accent-foreground">
                              Topic:
                            </span>{" "}
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
                        <span className="text-destructive">
                          Last Collection:
                        </span>{" "}
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

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden ">
            {/* Header */}
            <div className="border-b bg-background p-4">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">Vector Database Chat</h1>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="text-sm h-9">
                    {AVAILABLE_MODELS[selectedModel].name}
                  </Badge>
                  <ModeToggle />
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto py-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Ask me anything about your vector database!
                    </p>
                    <p className="text-xs mt-1">
                      Try the example queries on the left to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 px-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex gap-2 max-w-[85%] ${
                          message.type === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {message.type === "user" ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <Bot className="w-3 h-3" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-2 text-sm ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border"
                          }`}
                        >
                          <div>
                            {message.type === "assistant" ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => (
                                      <p className="mb-2 last:mb-0">
                                        {children}
                                      </p>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-foreground">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic text-muted-foreground">
                                        {children}
                                      </em>
                                    ),
                                    code: ({ children }) => (
                                      <code className="bg-card px-1 py-0.5 rounded text-xs font-mono text-primary">
                                        {children}
                                      </code>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-inside mb-2 space-y-1">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-inside mb-2 space-y-1">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="text-foreground">
                                        {children}
                                      </li>
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              message.content
                            )}
                          </div>

                          {message.type === "assistant" && message.data && (
                            <div>
                              {formatData(
                                message.data,
                                message.queryType || ""
                              )}
                            </div>
                          )}

                          {message.type === "assistant" &&
                            message.executionTime && (
                              <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                                <Clock className="w-3 h-3" />
                                <span>{message.executionTime}ms</span>
                                {message.queryType && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-1 text-xs"
                                  >
                                    {message.queryType}
                                  </Badge>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                          <Bot className="w-3 h-3" />
                        </div>
                        <div className="bg-muted rounded-lg p-2 border">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t bg-background p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about your vector database..."
                  disabled={isLoading}
                  className="flex-1 h-12"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="h-12 px-6"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
