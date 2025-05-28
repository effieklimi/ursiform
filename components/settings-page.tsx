"use client";

import {
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Github,
  Globe,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { AVAILABLE_MODELS } from "@/lib/types";
import { useAtom } from "jotai";
import { selectedModelAtom } from "@/lib/atoms";
import { useEffect, useState } from "react";

interface APIKeyStatus {
  openai: boolean;
  gemini: boolean;
}

interface DatabaseInfo {
  connected: boolean;
  url?: string;
  hasApiKey: boolean;
  error?: string;
}

export function SettingsPage() {
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [apiKeyStatus, setApiKeyStatus] = useState<APIKeyStatus>({
    openai: false,
    gemini: false,
  });
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo>({
    connected: false,
    hasApiKey: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAPIKeysAndDatabase();
  }, []);

  const checkAPIKeysAndDatabase = async () => {
    try {
      // Check API health endpoint which should return API key status
      const response = await fetch("/api/health");
      if (response.ok) {
        const data = await response.json();

        // Extract API key status from environment or response
        setApiKeyStatus({
          openai:
            !!process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
            data.openai_available ||
            false,
          gemini:
            !!process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
            data.gemini_available ||
            false,
        });

        // Extract database info
        setDatabaseInfo({
          connected: data.database_connected || false,
          url:
            data.database_url ||
            process.env.NEXT_PUBLIC_QDRANT_URL ||
            "localhost:6333",
          hasApiKey:
            !!data.database_api_key || !!process.env.NEXT_PUBLIC_QDRANT_API_KEY,
          error: data.database_error,
        });
      } else {
        // Fallback to environment variables
        setApiKeyStatus({
          openai: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          gemini: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        });

        setDatabaseInfo({
          connected: false,
          url: process.env.NEXT_PUBLIC_QDRANT_URL || "localhost:6333",
          hasApiKey: !!process.env.NEXT_PUBLIC_QDRANT_API_KEY,
          error: "Health check failed",
        });
      }
    } catch (error) {
      console.error("Failed to check API status:", error);
      // Set based on environment variables as fallback
      setApiKeyStatus({
        openai:
          typeof window !== "undefined" &&
          !!window.localStorage.getItem("openai_configured"),
        gemini:
          typeof window !== "undefined" &&
          !!window.localStorage.getItem("gemini_configured"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-2xl mx-auto space-y-6">
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
              <CardTitle className="flex items-center gap-2">
                API Keys Status
                {isLoading && <AlertCircle className="w-4 h-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={apiKeyStatus.openai} />
                    <div>
                      <div className="font-medium text-sm">OpenAI API Key</div>
                      <div className="text-xs text-muted-foreground">
                        Required for GPT models (GPT-4, GPT-4o, etc.)
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={apiKeyStatus.openai ? "default" : "destructive"}
                  >
                    {apiKeyStatus.openai ? "Configured" : "Missing"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={apiKeyStatus.gemini} />
                    <div>
                      <div className="font-medium text-sm">
                        Google Gemini API Key
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Required for Gemini models (Gemini Pro, Flash, etc.)
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={apiKeyStatus.gemini ? "default" : "destructive"}
                  >
                    {apiKeyStatus.gemini ? "Configured" : "Missing"}
                  </Badge>
                </div>
              </div>

              {(!apiKeyStatus.openai || !apiKeyStatus.gemini) && (
                <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <strong>Note:</strong> Missing API keys will prevent certain
                  models from working. Configure them in your environment
                  variables (.env file).
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Database Configuration
                <StatusIcon status={databaseInfo.connected} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Qdrant Connection</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>URL: {databaseInfo.url}</span>
                      {databaseInfo.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4"
                          onClick={() =>
                            window.open(`http://${databaseInfo.url}`, "_blank")
                          }
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={databaseInfo.connected ? "default" : "destructive"}
                  >
                    {databaseInfo.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Database API Key</div>
                    <div className="text-xs text-muted-foreground">
                      {databaseInfo.hasApiKey
                        ? "Configured for authenticated access"
                        : "No authentication configured"}
                    </div>
                  </div>
                  <Badge
                    variant={databaseInfo.hasApiKey ? "default" : "secondary"}
                  >
                    {databaseInfo.hasApiKey ? "Configured" : "Optional"}
                  </Badge>
                </div>
              </div>

              {databaseInfo.error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <strong>Connection Error:</strong> {databaseInfo.error}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Database connection settings are configured via environment
                variables. Check your .env file for QDRANT_URL and
                QDRANT_API_KEY settings.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Vector Database Chat Interface</p>
                  <p>Natural language interface for Qdrant vector databases</p>
                  <p>Built with Next.js, shadcn/ui, Tailwind CSS, and Jotai</p>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Built by</div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        E
                      </div>
                      <div>
                        <div className="font-medium text-sm">Effie Klimi</div>
                        <div className="text-xs text-muted-foreground">
                          Developer
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open("https://effie.bio", "_blank")
                        }
                        className="flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        Website
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open("https://github.com/effie-bio", "_blank")
                        }
                        className="flex items-center gap-1"
                      >
                        <Github className="w-3 h-3" />
                        GitHub
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
