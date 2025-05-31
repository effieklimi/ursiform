"use client";

import {
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Github,
  Globe,
  Loader2,
  Circle,
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
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { AVAILABLE_MODELS } from "@/lib/types";
import { useAtom } from "jotai";
import { selectedModelAtom } from "@/lib/atoms";
import { useEffect, useState } from "react";

type APIKeyStatus = "missing" | "testing" | "working" | "failed";

interface APIKeyStatusInfo {
  openai: {
    status: APIKeyStatus;
    error?: string;
  };
  gemini: {
    status: APIKeyStatus;
    error?: string;
  };
}

interface DatabaseInfo {
  connected: boolean;
  url?: string;
  hasApiKey: boolean;
  error?: string;
}

// Utility function to sanitize error messages and remove potential API keys
const sanitizeErrorMessage = (errorMessage: string): string => {
  if (!errorMessage) return errorMessage;

  let sanitized = errorMessage;

  // Common API key patterns to redact
  const patterns = [
    // OpenAI API keys (start with sk-)
    /sk-[a-zA-Z0-9]{20,}/g,
    // Google/Gemini API keys (typically 39 characters long, alphanumeric with hyphens)
    /AIza[a-zA-Z0-9_-]{35}/g,
    // Bearer tokens (capture the full Bearer + token)
    /Bearer\s+[a-zA-Z0-9_-]{10,}/gi,
    // Authorization headers (capture full authorization line)
    /Authorization[:\s]*[a-zA-Z0-9_\-\s]+/gi,
    // Generic API key patterns in key=value format
    /api[_-]?key[=:]\s*['"]*[a-zA-Z0-9_-]{10,}['"]*\s*/gi,
    /key[=:]\s*['"]*[a-zA-Z0-9_-]{10,}['"]*\s*/gi,
    // URL-embedded API keys (query parameters) - more specific patterns
    /[?&]key=[a-zA-Z0-9_-]{10,}/gi,
    /[?&]api[_-]?key=[a-zA-Z0-9_-]{10,}/gi,
    // Basic auth credentials in URLs
    /\/\/[^:\s\/]+:[^@\s\/]+@/g,
  ];

  // Apply all patterns to redact sensitive information
  patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  });

  // Additional specific sanitization for common error contexts

  // Remove any remaining long alphanumeric strings that might be keys (32+ chars)
  sanitized = sanitized.replace(/\b[a-zA-Z0-9_-]{32,}\b/g, "[REDACTED]");

  // Clean up any duplicate redactions or formatting issues
  sanitized = sanitized.replace(/\[REDACTED\]\[REDACTED\]/g, "[REDACTED]");
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
};

export function SettingsPage() {
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [apiKeyStatus, setApiKeyStatus] = useState<APIKeyStatusInfo>({
    openai: { status: "testing" },
    gemini: { status: "testing" },
  });
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo>({
    connected: false,
    hasApiKey: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("Checking...");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAPIKeysAndDatabase();
  }, []);

  useEffect(() => {
    if (mounted) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [apiKeyStatus, mounted]);

  const checkAPIKeysAndDatabase = async () => {
    try {
      // Check API health endpoint which should return API key status
      const response = await fetch("/api/health");

      if (response.ok) {
        const data = await response.json();

        // Use the new detailed status format
        const newApiKeyStatus = {
          openai: {
            status: data.openai_status || "missing",
            error: data.openai_error,
          },
          gemini: {
            status: data.gemini_status || "missing",
            error: data.gemini_error,
          },
        };
        setApiKeyStatus(newApiKeyStatus);

        // Extract database info from server response
        const newDatabaseInfo = {
          connected: data.database_connected || false,
          url: data.database_url || "localhost:6333",
          hasApiKey: data.database_api_key || false,
          error: data.database_error,
        };
        setDatabaseInfo(newDatabaseInfo);
      } else {
        // If health endpoint fails, show unknown status
        setApiKeyStatus({
          openai: { status: "failed", error: "Health check endpoint failed" },
          gemini: { status: "failed", error: "Health check endpoint failed" },
        });

        setDatabaseInfo({
          connected: false,
          url: "localhost:6333",
          hasApiKey: false,
          error: "Health check endpoint failed",
        });
      }
    } catch (error) {
      // Set error status on network failure
      setApiKeyStatus({
        openai: {
          status: "failed",
          error: "Network error during health check",
        },
        gemini: {
          status: "failed",
          error: "Network error during health check",
        },
      });

      setDatabaseInfo({
        connected: false,
        url: "localhost:6333",
        hasApiKey: false,
        error: "Network error connecting to health check",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: APIKeyStatus) => {
    switch (status) {
      case "working":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "testing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "missing":
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: APIKeyStatus) => {
    switch (status) {
      case "working":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            Working
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "testing":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Testing...
          </Badge>
        );
      case "missing":
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Not Configured
          </Badge>
        );
    }
  };

  const getStatusDescription = (status: APIKeyStatus, error?: string) => {
    switch (status) {
      case "working":
        return "API key is configured and working correctly";
      case "failed":
        return error
          ? `${sanitizeErrorMessage(error)}`
          : "API key exists but is not working";
      case "testing":
        return "Testing API key...";
      case "missing":
      default:
        return "API key not configured";
    }
  };

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="border-b bg-background p-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Settings</h1>
            <div className="ml-auto flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading settings...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  This setting will apply across the entire application.
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
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(apiKeyStatus.openai.status)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">OpenAI API Key</div>
                      <div className="text-xs text-muted-foreground">
                        {getStatusDescription(
                          apiKeyStatus.openai.status,
                          apiKeyStatus.openai.error
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(apiKeyStatus.openai.status)}
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(apiKeyStatus.gemini.status)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        Google Gemini API Key
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getStatusDescription(
                          apiKeyStatus.gemini.status,
                          apiKeyStatus.gemini.error
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(apiKeyStatus.gemini.status)}
                </div>
              </div>

              {(apiKeyStatus.openai.status === "missing" ||
                apiKeyStatus.gemini.status === "missing") && (
                <div className="text-xs text-warning   p-3 rounded-lg border border-warning">
                  Some API keys are missing. Configure them in your environment
                  variables (.env file) to enable all features.
                </div>
              )}

              {(apiKeyStatus.openai.status === "failed" ||
                apiKeyStatus.gemini.status === "failed") && (
                <div className="text-xs text-destructive   p-3 rounded-lg border border-destructive">
                  Some API keys are configured but not working. Please check
                  your API keys and try again.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Database Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Qdrant Connection</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="flex-1 truncate">
                        {databaseInfo.url && databaseInfo.url.length > 50
                          ? `${databaseInfo.url.substring(
                              0,
                              25
                            )}...${databaseInfo.url.substring(
                              databaseInfo.url.length - 25
                            )}`
                          : databaseInfo.url}
                      </span>
                      {databaseInfo.url && (
                        <a
                          href={(() => {
                            const url = databaseInfo.url!;
                            const protocol =
                              url.includes("localhost") ||
                              url.includes("127.0.0.1")
                                ? "http"
                                : "https";
                            const baseUrl = url.startsWith("http")
                              ? url
                              : `${protocol}://${url}`;
                            return (
                              baseUrl.replace(":6333", "") +
                              "/dashboard#/collections"
                            );
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-5 w-5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex-shrink-0"
                          title="Open Qdrant Dashboard"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      databaseInfo.connected
                        ? "default"
                        : isLoading
                        ? "secondary"
                        : "outline"
                    }
                    className="flex items-center gap-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting...
                      </>
                    ) : databaseInfo.connected ? (
                      "Connected"
                    ) : (
                      "Disconnected"
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                <div className="text-xs text-destructive  bg-background p-3 rounded-lg border border-destructive">
                  <strong>Connection Error:</strong>{" "}
                  {sanitizeErrorMessage(databaseInfo.error)}
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
                  <p>Natural language interface for Qdrant vector databases</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <Link
                    href="https://github.com/effieklimi/yearn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    GitHub
                  </Link>
                  <Link
                    href="mailto:effie@effie.bio"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact
                  </Link>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm font-normal mb-2">
                    Built by{" "}
                    <span className="hover:underline font-medium">
                      <a href="https://effie.bio" target="_blank">
                        effie.bio
                      </a>
                    </span>
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
