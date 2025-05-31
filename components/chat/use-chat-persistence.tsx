"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/components/providers/trpc-provider";
import { ChatMessage } from "@/lib/types";
import { Chat, Message } from "@prisma/client";

// Type for chat with parsed tags
type ChatWithTags = Chat & {
  parsedTags?: string[];
};

export function useChatPersistence() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatWithTags[]>([]);

  // tRPC queries and mutations
  const utils = trpc.useUtils();

  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (newChat: Chat) => {
      setCurrentChatId(newChat.id);
      // Convert to ChatWithTags and add to state
      const chatWithTags: ChatWithTags = {
        ...newChat,
        parsedTags: newChat.tags ? JSON.parse(newChat.tags) : [],
      };
      setChats((prev) => [chatWithTags, ...prev]);
    },
  });

  const addMessageMutation = trpc.message.add.useMutation({
    onSuccess: () => {
      // Optionally invalidate queries to refresh data
      utils.message.getByChatId.invalidate();
    },
  });

  const generateTitleAndTagsMutation =
    trpc.chat.generateTitleAndTags.useMutation({
      onSuccess: (updatedChat: Chat) => {
        // Update the chat in the local state with parsed tags
        const chatWithTags: ChatWithTags = {
          ...updatedChat,
          parsedTags: updatedChat.tags ? JSON.parse(updatedChat.tags) : [],
        };
        setChats((prev) =>
          prev.map((chat) => (chat.id === updatedChat.id ? chatWithTags : chat))
        );
      },
    });

  const { data: allChats } = trpc.chat.getAll.useQuery();

  // Load chats when component mounts
  useEffect(() => {
    if (allChats) {
      setChats(allChats as ChatWithTags[]);
    }
  }, [allChats]);

  // Create a new chat
  const createNewChat = useCallback(
    async (title?: string, tags?: string[]) => {
      try {
        const newChat = await createChatMutation.mutateAsync({ title, tags });
        return newChat;
      } catch (error) {
        console.error("Error creating chat:", error);
        throw error;
      }
    },
    [createChatMutation]
  );

  // Save a message to the database
  const saveMessage = useCallback(
    async (chatId: string, role: "user" | "assistant", content: string) => {
      try {
        const savedMessage = await addMessageMutation.mutateAsync({
          chatId,
          role,
          content,
        });
        return savedMessage;
      } catch (error) {
        console.error("Error saving message:", error);
        throw error;
      }
    },
    [addMessageMutation]
  );

  // Check if this is the first exchange in a chat
  const isFirstExchange = useCallback(
    async (chatId: string): Promise<boolean> => {
      try {
        const messages = await utils.message.getByChatId.fetch({ chatId });
        return messages.length === 0; // No messages yet means this will be the first exchange
      } catch (error) {
        console.error("Error checking message count:", error);
        return false;
      }
    },
    [utils]
  );

  // Generate title and tags for a chat
  const generateChatTitleAndTags = useCallback(
    async (
      chatId: string,
      userMessage: string,
      assistantMessage: string,
      selectedCollection?: string
    ) => {
      try {
        console.log("🏷️ Generating title and tags for chat:", chatId);
        await generateTitleAndTagsMutation.mutateAsync({
          chatId,
          userMessage,
          assistantMessage,
          selectedCollection,
        });
        console.log("✅ Chat title and tags generated successfully");
      } catch (error) {
        console.error("Error generating chat title and tags:", error);
        // Don't throw - title generation is not critical
      }
    },
    [generateTitleAndTagsMutation]
  );

  // Save both user and assistant messages for a conversation turn
  const saveConversationTurn = useCallback(
    async (
      userMessage: ChatMessage,
      assistantMessage: ChatMessage,
      selectedCollection?: string
    ) => {
      try {
        // Create a new chat if none exists
        let chatId = currentChatId;
        let isNewChat = false;

        if (!chatId) {
          const newChat = await createNewChat(
            `Chat ${new Date().toLocaleString()}`
          );
          chatId = newChat.id;
          isNewChat = true;
        }

        // Check if this is the first exchange (only if not a new chat)
        const shouldGenerateTitleAndTags =
          isNewChat || (await isFirstExchange(chatId));

        // Save user message
        await saveMessage(chatId, "user", userMessage.content);

        // Save assistant message
        await saveMessage(chatId, "assistant", assistantMessage.content);

        // Generate title and tags automatically after first exchange
        if (shouldGenerateTitleAndTags) {
          // Don't await this - let it run in background
          generateChatTitleAndTags(
            chatId,
            userMessage.content,
            assistantMessage.content,
            selectedCollection
          );
        }

        return chatId;
      } catch (error) {
        console.error("Error saving conversation turn:", error);
        throw error;
      }
    },
    [
      currentChatId,
      createNewChat,
      saveMessage,
      isFirstExchange,
      generateChatTitleAndTags,
    ]
  );

  // Load messages for a specific chat
  const loadChatMessages = useCallback(
    async (chatId: string): Promise<ChatMessage[]> => {
      try {
        const chat = await utils.chat.getById.fetch({ id: chatId });
        if (!chat) return [];

        return chat.messages.map((msg: Message) => ({
          id: msg.id,
          type: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: msg.createdAt,
        }));
      } catch (error) {
        console.error("Error loading chat messages:", error);
        return [];
      }
    },
    [utils]
  );

  // Switch to a different chat
  const switchToChat = useCallback(
    async (chatId: string) => {
      setCurrentChatId(chatId);
      const messages = await loadChatMessages(chatId);
      return messages;
    },
    [loadChatMessages]
  );

  // Start a new chat session
  const startNewChat = useCallback(() => {
    setCurrentChatId(null);
    return [];
  }, []);

  return {
    currentChatId,
    chats,
    createNewChat,
    saveMessage,
    saveConversationTurn,
    loadChatMessages,
    switchToChat,
    startNewChat,
    generateChatTitleAndTags,
    isCreatingChat: createChatMutation.isPending,
    isSavingMessage: addMessageMutation.isPending,
    isGeneratingTitleAndTags: generateTitleAndTagsMutation.isPending,
  };
}
