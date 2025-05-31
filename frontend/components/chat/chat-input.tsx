"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatInput({
  inputValue,
  setInputValue,
  isLoading,
  onSubmit,
}: ChatInputProps) {
  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={onSubmit} className="flex gap-3">
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
          className="h-12 px-6 w-12"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
