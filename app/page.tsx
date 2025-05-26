import ChatInterface from "../components/chat-interface";

export const metadata = {
  title: "Yearn - Natural Language Query Interface",
  description: "Ask questions about your vector collections in plain English",
  viewport: "width=device-width, initial-scale=1",
  icons: { icon: "/favicon.ico" },
};

export default function Home() {
  return (
    <main className="h-screen w-screen bg-gray-900 overflow-hidden">
      <ChatInterface />
    </main>
  );
}
