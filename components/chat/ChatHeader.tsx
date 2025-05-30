"use client";

import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
import { AVAILABLE_MODELS, ModelKey } from "@/lib/types";

interface ChatHeaderProps {
  selectedModel: ModelKey;
}

export function ChatHeader({ selectedModel }: ChatHeaderProps) {
  return (
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
  );
}
