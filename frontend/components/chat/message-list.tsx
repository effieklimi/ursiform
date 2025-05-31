"use client";

import { useRef, useEffect } from "react";
import { Bot, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/lib/types";
import { UrsiformLogo } from "../icons/UrsiformLogo";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  formatData: (data: any, queryType: string) => React.ReactNode;
}

export function MessageList({
  messages,
  isLoading,
  formatData,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            {/* <img
              src="/ursiform.svg"
              alt="ursiform"
              width={100}
              height={100}
              className="w-10 h-10 mx-auto mb-3 opacity-50"
            /> */}
            <UrsiformLogo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Ask me anything about your vector database!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex gap-2 max-w-[85%] ${
                  message.type === "user" ? "flex-row-reverse" : "flex-row"
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
                              <p className="mb-2 last:mb-0">{children}</p>
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
                              <li className="text-foreground">{children}</li>
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

                  {message.type === "assistant" && message.executionTime && (
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                      <Clock className="w-3 h-3" />
                      <span>{message.executionTime}ms</span>
                      {message.queryType && (
                        <Badge variant="secondary" className="ml-1 text-xs">
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
  );
}
