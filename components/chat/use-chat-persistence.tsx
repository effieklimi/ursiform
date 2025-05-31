"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/components/providers/trpc-provider";
import { ChatMessage } from "@/lib/types";
import { Chat, Message } from "@prisma/client";

export function useChatPersistence() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);

  // tRPC queries and mutations
  const utils = trpc.useUtils();

  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (newChat: Chat) => {
      setCurrentChatId(newChat.id);
      setChats((prev) => [newChat, ...prev]);
    },
  });

  const addMessageMutation = trpc.message.add.useMutation({
    onSuccess: () => {
      // Optionally invalidate queries to refresh data
      utils.message.getByChatId.invalidate();
    },
  });

  const generateTitleMutation = trpc.chat.generateTitle.useMutation({
    onSuccess: (updatedChat: Chat) => {
      // Update the chat in the local state
      setChats((prev) =>
        prev.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
      );
    },
  });

  const { data: allChats } = trpc.chat.getAll.useQuery();

  // Load chats when component mounts
  useEffect(() => {
    if (allChats) {
      setChats(allChats);
    }
  }, [allChats]);

  // Create a new chat
  const createNewChat = useCallback(
    async (title?: string) => {
      try {
        const newChat = await createChatMutation.mutateAsync({ title });
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

  // Generate title for a chat
  const generateChatTitle = useCallback(
    async (chatId: string, userMessage: string, assistantMessage: string) => {
      try {
        console.log("🏷️ Generating title for chat:", chatId);
        await generateTitleMutation.mutateAsync({
          chatId,
          userMessage,
          assistantMessage,
        });
        console.log("✅ Chat title generated successfully");
      } catch (error) {
        console.error("Error generating chat title:", error);
        // Don't throw - title generation is not critical
      }
    },
    [generateTitleMutation]
  );

  // Save both user and assistant messages for a conversation turn
  const saveConversationTurn = useCallback(
    async (userMessage: ChatMessage, assistantMessage: ChatMessage) => {
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
        const shouldGenerateTitle =
          isNewChat || (await isFirstExchange(chatId));

        // Save user message
        await saveMessage(chatId, "user", userMessage.content);

        // Save assistant message
        await saveMessage(chatId, "assistant", assistantMessage.content);

        // Generate title automatically after first exchange
        if (shouldGenerateTitle) {
          // Don't await this - let it run in background
          generateChatTitle(
            chatId,
            userMessage.content,
            assistantMessage.content
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
      generateChatTitle,
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
    generateChatTitle,
    isCreatingChat: createChatMutation.isPending,
    isSavingMessage: addMessageMutation.isPending,
    isGeneratingTitle: generateTitleMutation.isPending,
  };
}
