import { prisma } from "./prisma";
import type { Chat, Message } from "@prisma/client";

export type ChatWithMessages = Chat & {
  messages: Message[];
};

export class DatabaseService {
  // Chat operations
  static async createChat(title?: string): Promise<Chat> {
    return prisma.chat.create({
      data: {
        title: title || null,
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

  static async getAllChats(): Promise<Chat[]> {
    return prisma.chat.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  static async updateChat(id: string, title: string): Promise<Chat> {
    return prisma.chat.update({
      where: { id },
      data: { title },
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
