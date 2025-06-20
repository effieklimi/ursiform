"use client";

import { useState } from "react";
import { SideNavigation } from "@/lib/frontend/components/side-navigation";
import { ChatHeader } from "@/lib/frontend/components/chat/chat-header";
import { ChatInput } from "@/lib/frontend/components/chat/chat-input";
import { MessageList } from "@/lib/frontend/components/chat/message-list";
import { ChatSidebar } from "@/lib/frontend/components/chat/chat-sidebar";
import { useDataFormatting } from "@/lib/frontend/components/chat/use-data-formatting";
import { useChatLogic } from "@/lib/frontend/components/chat/use-chat-logic";
import { useChatPersistence } from "@/lib/frontend/components/chat/use-chat-persistence";
import { ChatMessage } from "@/lib/types";
import { useAtom } from "jotai";
import {
  selectedModelAtom,
  selectedCollectionAtom,
  conversationContextAtom,
} from "@/lib/atoms";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useAtom(
    selectedCollectionAtom
  );
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [conversationContext, setConversationContext] = useAtom(
    conversationContextAtom
  );

  const { formatData } = useDataFormatting();
  const { collections, demoExamples } = useChatLogic(selectedModel);

  // Chat persistence
  const {
    currentChatId,
    chats,
    saveConversationTurn,
    switchToChat,
    startNewChat,
    isSavingMessage,
  } = useChatPersistence();

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

      // Save the conversation turn to the database
      try {
        await saveConversationTurn(
          userMessage,
          assistantMessage,
          selectedCollection
        );
        console.log("💾 SAVED CONVERSATION TURN TO DATABASE");
      } catch (saveError) {
        console.error("Failed to save conversation turn:", saveError);
        // Continue with the UI update even if saving fails
      }

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

  // Handle chat switching
  const handleChatSwitch = async (chatId: string) => {
    try {
      const chatMessages = await switchToChat(chatId);
      setMessages(chatMessages);
      // Reset conversation context when switching chats
      setConversationContext({
        conversationHistory: [],
      });
    } catch (error) {
      console.error("Error switching to chat:", error);
    }
  };

  // Handle new chat creation
  const handleNewChat = () => {
    const emptyMessages = startNewChat();
    setMessages(emptyMessages);
    setConversationContext({
      conversationHistory: [],
    });
  };

  return (
    <main className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-full">
        {/* Side Navigation */}
        <SideNavigation currentPage="chat" />

        {/* Chat Interface */}
        <div className="flex h-full w-full">
          {/* Model Selection Panel */}
          <ChatSidebar
            selectedCollection={selectedCollection}
            setSelectedCollection={setSelectedCollection}
            collections={collections}
            conversationContext={conversationContext}
            setConversationContext={setConversationContext}
            demoExamples={demoExamples}
            handleExampleClick={handleExampleClick}
            // Chat management props
            chats={chats}
            currentChatId={currentChatId}
            onChatSwitch={handleChatSwitch}
            onNewChat={handleNewChat}
          />

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <ChatHeader selectedModel={selectedModel} />

            {/* Chat Messages Area */}
            <MessageList
              messages={messages}
              isLoading={isLoading || isSavingMessage}
              formatData={formatData}
            />

            {/* Input area */}
            <ChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              isLoading={isLoading || isSavingMessage}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
