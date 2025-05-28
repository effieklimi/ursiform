"use client";

import { MessageCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageType = "chat" | "settings";

interface SideNavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function SideNavigation({
  currentPage,
  onPageChange,
}: SideNavigationProps) {
  return (
    <div className="w-14 flex-shrink-0 border-r bg-background flex flex-col items-center py-4 space-y-3">
      <Button
        variant={currentPage === "chat" ? "default" : "ghost"}
        size="icon"
        onClick={() => onPageChange("chat")}
        className="w-10 h-10"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="sr-only">Chat</span>
      </Button>

      <Button
        variant={currentPage === "settings" ? "default" : "ghost"}
        size="icon"
        onClick={() => onPageChange("settings")}
        className="w-10 h-10"
      >
        <Settings className="w-6 h-6" />
        <span className="sr-only">Settings</span>
      </Button>
    </div>
  );
}

export type { PageType };
