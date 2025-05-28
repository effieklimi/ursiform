"use client";

import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/mode-toggle";
import { AVAILABLE_MODELS } from "@/lib/types";
import { useAtom } from "jotai";
import { selectedModelAtom } from "@/lib/atoms";

export function SettingsPage() {
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </div>
      </div>

      {/* Settings Content - Centered */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Default AI Model
                </label>
                <Select
                  value={selectedModel}
                  onValueChange={(value) => setSelectedModel(value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select default model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>OpenAI Models</SelectLabel>
                      {Object.entries(AVAILABLE_MODELS)
                        .filter(([_, info]) => info.provider === "openai")
                        .map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Gemini Models</SelectLabel>
                      {Object.entries(AVAILABLE_MODELS)
                        .filter(([_, info]) => info.provider === "gemini")
                        .map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This setting will apply across the entire application and is
                  saved to localStorage.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Theme</label>
                <div className="flex items-center space-x-2">
                  <ModeToggle />
                  <span className="text-sm text-muted-foreground">
                    Toggle between light, dark, and system theme
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Qdrant Connection
                </label>
                <div className="text-sm text-muted-foreground">
                  Database connection settings are configured via environment
                  variables.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Vector Database Chat Interface</p>
                <p>Natural language interface for Qdrant vector databases</p>
                <p>Built with Next.js, shadcn/ui, Tailwind CSS, and Jotai</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
