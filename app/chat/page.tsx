import ChatPage from "@/components/chat-page";
import { TestTRPC } from "@/components/test-trpc";

export const metadata = {
  title: "Chat - Yearn",
  description: "Ask questions about your vector collections in plain English",
};

export default function Chat() {
  return (
    <div>
      <div className="mb-6">
        <TestTRPC />
      </div>
      <ChatPage />
    </div>
  );
}
