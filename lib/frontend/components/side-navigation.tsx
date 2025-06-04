"use client";

import { MessageCircle, Settings } from "lucide-react";
import { Button } from "@/lib/frontend/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

type PageType = "chat" | "settings";

interface SideNavigationProps {
  currentPage?: PageType;
}

export function SideNavigation({ currentPage }: SideNavigationProps) {
  const pathname = usePathname();

  // Determine current page from pathname if not explicitly provided
  const activePage =
    currentPage || (pathname === "/settings" ? "settings" : "chat");

  return (
    <div className="w-14 flex-shrink-0 border-r bg-background flex flex-col items-center py-4 space-y-3">
      <Link href="/chat">
        <Button
          variant={activePage === "chat" ? "default" : "ghost"}
          size="icon"
          className="w-10 h-10"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="sr-only">Chat</span>
        </Button>
      </Link>

      <Link href="/settings">
        <Button
          variant={activePage === "settings" ? "default" : "ghost"}
          size="icon"
          className="w-10 h-10"
        >
          <Settings className="w-6 h-6" />
          <span className="sr-only">Settings</span>
        </Button>
      </Link>
    </div>
  );
}

export type { PageType };
