import "../lib/frontend/styles/globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/frontend/components/theme-provider";
import { Provider } from "jotai";
import { TRPCProvider } from "@/lib/frontend/components/providers/trpc-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <TRPCProvider>
          <Provider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </Provider>
        </TRPCProvider>
      </body>
    </html>
  );
}
