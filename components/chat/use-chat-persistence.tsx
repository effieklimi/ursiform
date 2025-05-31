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

  // Save both user and assistant messages for a conversation turn
  const saveConversationTurn = useCallback(
    async (userMessage: ChatMessage, assistantMessage: ChatMessage) => {
      try {
        // Create a new chat if none exists
        let chatId = currentChatId;
        if (!chatId) {
          const newChat = await createNewChat(
            `Chat ${new Date().toLocaleString()}`
          );
          chatId = newChat.id;
        }

        // Save user message
        await saveMessage(chatId, "user", userMessage.content);

        // Save assistant message
        await saveMessage(chatId, "assistant", assistantMessage.content);

        return chatId;
      } catch (error) {
        console.error("Error saving conversation turn:", error);
        throw error;
      }
    },
    [currentChatId, createNewChat, saveMessage]
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
    isCreatingChat: createChatMutation.isPending,
    isSavingMessage: addMessageMutation.isPending,
  };
}
