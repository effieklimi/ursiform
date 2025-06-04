"use client";

import { Badge } from "@/lib/frontend/components/ui/badge";
import { ModeToggle } from "@/lib/frontend/components/mode-toggle";
import { AVAILABLE_MODELS, ModelKey } from "@/lib/types";
import { UrsiformLogo } from "@/lib/frontend/components/icons/UrsiformLogo";

interface ChatHeaderProps {
  selectedModel: ModelKey;
}

export function ChatHeader({ selectedModel }: ChatHeaderProps) {
  // Debug logging to see what's being passed
  console.log("ChatHeader selectedModel:", selectedModel);
  console.log("Available model keys:", Object.keys(AVAILABLE_MODELS));
  console.log(
    "selectedModel exists in AVAILABLE_MODELS:",
    selectedModel in AVAILABLE_MODELS
  );

  // Safe access to model info with fallback
  const modelInfo =
    selectedModel && AVAILABLE_MODELS[selectedModel]
      ? AVAILABLE_MODELS[selectedModel]
      : { name: "Unknown Model" };

  return (
    <div className="border-b bg-background p-2">
      <div className="flex items-center gap-2">
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-xs h-9 font-normal">
            {modelInfo.name}
          </Badge>
          <ModeToggle />
        </div>
        <UrsiformLogo className="w-8 h-8 opacity-50" />
      </div>
    </div>
  );
}
