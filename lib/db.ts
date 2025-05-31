import { prisma } from "./prisma";
import type { Chat, Message } from "@prisma/client";

export type ChatWithMessages = Chat & {
  messages: Message[];
};

export type ChatWithTags = Chat & {
  parsedTags?: string[];
};

export class DatabaseService {
  // Helper method to parse tags from JSON string
  static parseTags(tagsJson: string | null): string[] {
    if (!tagsJson) return [];
    try {
      return JSON.parse(tagsJson);
    } catch {
      return [];
    }
  }

  // Helper method to stringify tags to JSON
  static stringifyTags(tags: string[]): string {
    return JSON.stringify(tags);
  }

  // Chat operations
  static async createChat(title?: string, tags?: string[]): Promise<Chat> {
    return prisma.chat.create({
      data: {
        title: title || null,
        tags: tags && tags.length > 0 ? this.stringifyTags(tags) : null,
      },
    });
  }

  static async getChat(id: string): Promise<ChatWithMessages | null> {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  static async getAllChats(): Promise<ChatWithTags[]> {
    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return chats.map((chat) => ({
      ...chat,
      parsedTags: this.parseTags(chat.tags),
    }));
  }

  static async updateChat(
    id: string,
    title: string,
    tags?: string[]
  ): Promise<Chat> {
    const updateData: { title: string; tags?: string | null } = { title };
    if (tags !== undefined) {
      updateData.tags = tags.length > 0 ? this.stringifyTags(tags) : null;
    }

    return prisma.chat.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteChat(id: string): Promise<void> {
    await prisma.chat.delete({
      where: { id },
    });
  }

  // Message operations
  static async addMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<Message> {
    return prisma.message.create({
      data: {
        chatId,
        role,
        content,
      },
    });
  }

  static async getMessages(chatId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });
  }

  static async deleteMessage(id: string): Promise<void> {
    await prisma.message.delete({
      where: { id },
    });
  }

  // Utility methods
  static async getChatCount(): Promise<number> {
    return prisma.chat.count();
  }

  static async getMessageCount(): Promise<number> {
    return prisma.message.count();
  }
}
