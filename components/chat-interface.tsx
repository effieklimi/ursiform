"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Clock, Database, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import {
  ChatMessage,
  AVAILABLE_MODELS,
  ModelKey,
  ConversationContext,
} from "@/lib/types";

interface DynamicExamples {
  database: string[];
  collection: string[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<ModelKey>("gpt-4o-mini");
  const [collections, setCollections] = useState<string[]>([]);
  const [conversationContext, setConversationContext] =
    useState<ConversationContext>({
      conversationHistory: [],
    });
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
          <div className="text-sm font-medium text-gray-300">
            Collections Found:
          </div>
          {data.collections.map((collection: any, index: number) => (
            <div
              key={index}
              className="text-sm bg-gray-800 rounded px-2 py-1 border border-gray-700"
            >
              <span className="font-medium text-white">{collection.name}</span>
              {collection.vectors_count !== undefined && (
                <span className="text-gray-400 ml-2">
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
            <div className="text-gray-300">
              Total Collections:{" "}
              <span className="font-medium text-white">
                {data.total_collections}
              </span>
            </div>
            <div className="text-gray-300">
              Total Vectors:{" "}
              <span className="font-medium text-white">
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
          <Badge variant="secondary" className="bg-gray-700 text-gray-200">
            {data.count.toLocaleString()} items
          </Badge>
          {data.artist && (
            <div className="mt-1 text-gray-300">
              Artist:{" "}
              <span className="text-white font-medium">{data.artist}</span>
            </div>
          )}
          {data.by_collection && data.by_collection.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-400">Found in collections:</div>
              {data.by_collection.map((col: any, index: number) => (
                <div
                  key={index}
                  className="text-xs bg-gray-800 rounded px-2 py-1 border border-gray-700"
                >
                  <span className="text-white">{col.collection}</span>:{" "}
                  <span className="text-gray-300">{col.count} images</span>
                </div>
              ))}
            </div>
          )}
          {data.artists && data.artists.length > 0 && (
            <div className="mt-1 text-gray-300">
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
          <div className="text-sm font-medium text-gray-300">
            Summary of {data.artist}'s Work:
          </div>
          <div className="bg-gray-800 rounded p-3 border border-gray-700 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-gray-300">
                Total Images:{" "}
                <span className="text-white font-medium">
                  {data.total_images || 0}
                </span>
              </div>
              <div className="text-gray-300">
                Displayed:{" "}
                <span className="text-white font-medium">
                  {data.displayed_images || 0}
                </span>
              </div>
            </div>
            {data.collections_found && (
              <div className="text-xs text-gray-300">
                Found in:{" "}
                <span className="text-white">
                  {data.collections_found} collections
                </span>
              </div>
            )}
            {data.file_types && data.file_types.length > 0 && (
              <div className="text-xs text-gray-300">
                File Types:{" "}
                <span className="text-white">{data.file_types.join(", ")}</span>
              </div>
            )}
            {data.sample_images && data.sample_images.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-300">
                  Sample Images:
                </div>
                {data.sample_images
                  .slice(0, 3)
                  .map((img: any, index: number) => (
                    <div
                      key={index}
                      className="text-xs bg-gray-900 rounded px-2 py-1 border border-gray-600"
                    >
                      <span className="text-blue-300">{img.filename}</span>
                      {img.collection && (
                        <span className="text-gray-400 ml-1">
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
          <div className="text-sm font-medium text-gray-300">
            Analysis of {data.artist}'s Work:
          </div>
          <div className="bg-gray-800 rounded p-3 border border-gray-700 space-y-2">
            <div className="text-xs">
              <span className="text-gray-300">Total Images: </span>
              <span className="text-white font-medium">
                {data.total_images || 0}
              </span>
            </div>
            {data.file_type_distribution &&
              Object.keys(data.file_type_distribution).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-300">
                    File Types:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(data.file_type_distribution).map(
                      ([type, count]: [string, any]) => (
                        <span
                          key={type}
                          className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-700/50"
                        >
                          {type}: {count}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            {data.common_naming_patterns &&
              Object.keys(data.common_naming_patterns).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-300">
                    Common Patterns:
                  </div>
                  {Object.entries(data.common_naming_patterns)
                    .slice(0, 3)
                    .map(([pattern, count]: [string, any]) => (
                      <div key={pattern} className="text-xs text-gray-300">
                        <code className="bg-gray-900 px-1 rounded text-green-300">
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
          <div className="text-sm font-medium text-gray-300">
            Search Results ({data.total_count} total):
          </div>
          {data.results_by_collection
            .slice(0, 3)
            .map((result: any, index: number) => (
              <div
                key={index}
                className="text-sm bg-gray-800 rounded px-2 py-1 border border-gray-700"
              >
                <span className="font-medium text-white">
                  {result.collection}
                </span>
                : <span className="text-gray-300">{result.count} matches</span>
              </div>
            ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex h-full">
        {/* Model Selection Panel */}
        <div className="w-80 flex-shrink-0 border-r border-gray-700 bg-gray-900 overflow-y-auto">
          <div className="p-4 space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-100 text-sm">
                  <Bot className="w-4 h-4" />
                  Query Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-gray-300">
                    AI Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) =>
                      setSelectedModel(e.target.value as ModelKey)
                    }
                    className="w-full p-2 text-sm bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    <optgroup label="OpenAI Models">
                      {Object.entries(AVAILABLE_MODELS)
                        .filter(([_, info]) => info.provider === "openai")
                        .map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Gemini Models">
                      {Object.entries(AVAILABLE_MODELS)
                        .filter(([_, info]) => info.provider === "gemini")
                        .map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block text-gray-300">
                    Collection (Optional)
                  </label>
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="w-full p-2 text-sm bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    <option value="">Database-level query</option>
                    {collections.map((collection) => (
                      <option key={collection} value={collection}>
                        {collection}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conversation Context Indicator */}
                {(conversationContext.lastEntity ||
                  conversationContext.lastCollection ||
                  conversationContext.conversationHistory.length > 0) && (
                  <div className="border-t border-gray-700 pt-3">
                    <label className="text-xs font-medium mb-2 block text-gray-300">
                      Conversation Context
                    </label>
                    <div className="space-y-1">
                      {conversationContext.lastEntity && (
                        <div className="text-xs bg-purple-900/30 rounded px-2 py-1 border border-purple-700/50">
                          <span className="text-purple-300">Entity:</span>{" "}
                          <span className="text-white">
                            {conversationContext.lastEntity}
                          </span>
                        </div>
                      )}
                      {conversationContext.lastCollection && (
                        <div className="text-xs bg-blue-900/30 rounded px-2 py-1 border border-blue-700/50">
                          <span className="text-blue-300">Collection:</span>{" "}
                          <span className="text-white">
                            {conversationContext.lastCollection}
                          </span>
                        </div>
                      )}
                      {conversationContext.conversationHistory.length > 0 && (
                        <div className="text-xs bg-gray-800/50 rounded px-2 py-1 border border-gray-600">
                          <span className="text-gray-300">History:</span>{" "}
                          <span className="text-white">
                            {conversationContext.conversationHistory.length}{" "}
                            turns
                          </span>
                        </div>
                      )}
                      {conversationContext.currentTopic && (
                        <div className="text-xs bg-green-900/30 rounded px-2 py-1 border border-green-700/50">
                          <span className="text-green-300">Topic:</span>{" "}
                          <span className="text-white">
                            {conversationContext.currentTopic}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setConversationContext({ conversationHistory: [] })
                      }
                      className="text-xs text-gray-400 hover:text-white mt-2 underline"
                    >
                      Clear Context
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-100 text-sm">
                  <Database className="w-4 h-4" />
                  Example Queries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-medium mb-1 text-gray-300">
                    Database-level:
                  </div>
                  <div className="space-y-1">
                    {demoExamples.database.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs text-left w-full p-2 bg-blue-900/30 hover:bg-blue-800/40 rounded border border-blue-700/50 text-blue-300 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1 text-gray-300">
                    Collection-specific:
                  </div>
                  <div className="space-y-1">
                    {demoExamples.collection.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs text-left w-full p-2 bg-green-900/30 hover:bg-green-800/40 rounded border border-green-700/50 text-green-300 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation Examples */}
                <div>
                  <div className="text-xs font-medium mb-1 text-gray-300">
                    Conversational:
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() =>
                        handleExampleClick("Show me Chris Dyer's work")
                      }
                      className="text-xs text-left w-full p-2 bg-purple-900/30 hover:bg-purple-800/40 rounded border border-purple-700/50 text-purple-300 transition-colors"
                    >
                      Show me Chris Dyer's work
                    </button>
                    <button
                      onClick={() =>
                        handleExampleClick("How many items do they have?")
                      }
                      className="text-xs text-left w-full p-2 bg-purple-900/30 hover:bg-purple-800/40 rounded border border-purple-700/50 text-purple-300 transition-colors"
                    >
                      How many items do they have?
                      <span className="text-purple-400 ml-1">
                        (after asking about an artist)
                      </span>
                    </button>
                    <button
                      onClick={() => handleExampleClick("What about Alice?")}
                      className="text-xs text-left w-full p-2 bg-purple-900/30 hover:bg-purple-800/40 rounded border border-purple-700/50 text-purple-300 transition-colors"
                    >
                      What about Alice?
                      <span className="text-purple-400 ml-1">
                        (continuing conversation)
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        handleExampleClick("Also show me their latest work")
                      }
                      className="text-xs text-left w-full p-2 bg-purple-900/30 hover:bg-purple-800/40 rounded border border-purple-700/50 text-purple-300 transition-colors"
                    >
                      Also show me their latest work
                      <span className="text-purple-400 ml-1">
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
              <Card className="bg-gray-900 border-yellow-700">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-yellow-300 text-sm">
                    🧠 Debug: Conversation Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conversationContext.lastEntity && (
                    <div className="text-xs">
                      <span className="text-yellow-300">Last Entity:</span>{" "}
                      <span className="text-white font-mono bg-gray-800 px-1 rounded">
                        {conversationContext.lastEntity}
                      </span>
                    </div>
                  )}
                  {conversationContext.lastCollection && (
                    <div className="text-xs">
                      <span className="text-yellow-300">Last Collection:</span>{" "}
                      <span className="text-white font-mono bg-gray-800 px-1 rounded">
                        {conversationContext.lastCollection}
                      </span>
                    </div>
                  )}
                  {conversationContext.lastQueryType && (
                    <div className="text-xs">
                      <span className="text-yellow-300">Last Query:</span>{" "}
                      <span className="text-white font-mono bg-gray-800 px-1 rounded">
                        {conversationContext.lastQueryType}{" "}
                        {conversationContext.lastTarget}
                      </span>
                    </div>
                  )}
                  {conversationContext.currentTopic && (
                    <div className="text-xs">
                      <span className="text-yellow-300">Current Topic:</span>{" "}
                      <span className="text-white font-mono bg-gray-800 px-1 rounded">
                        {conversationContext.currentTopic}
                      </span>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-yellow-300">History:</span>{" "}
                    <span className="text-white font-mono bg-gray-800 px-1 rounded">
                      {conversationContext.conversationHistory.length} turns
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setConversationContext({ conversationHistory: [] })
                    }
                    className="text-xs text-yellow-400 hover:text-white mt-2 underline"
                  >
                    Clear Context
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center gap-2 text-gray-100">
              <Search className="w-5 h-5" />
              <h1 className="text-lg font-semibold">Vector Database Chat</h1>
              <Badge
                variant="outline"
                className="ml-auto text-sm border-gray-600 text-gray-300"
              >
                {AVAILABLE_MODELS[selectedModel].name}
              </Badge>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Ask me anything about your vector database!
                  </p>
                  <p className="text-xs mt-1 text-gray-500">
                    Try the example queries on the left to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.type === "user" ? "justify-end" : "justify-start"
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
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300"
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
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-100 border border-gray-700"
                        }`}
                      >
                        <div>
                          {message.type === "assistant" ? (
                            <div className="prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0">{children}</p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-white">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic text-gray-300">
                                      {children}
                                    </em>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-gray-700 px-1 py-0.5 rounded text-xs font-mono text-gray-200">
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
                                    <li className="text-gray-200">
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
                            {formatData(message.data, message.queryType || "")}
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
                                  className="ml-1 text-xs bg-gray-700 text-gray-300"
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
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center">
                        <Bot className="w-3 h-3" />
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
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
          <div className="border-t border-gray-700 bg-gray-900 p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your vector database..."
                disabled={isLoading}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 h-12"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
