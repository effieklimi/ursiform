import ChatPage from "@/components/chat-page";
import { TestTRPC } from "@/components/test-trpc";

export const metadata = {
  title: "Chat - Yearn",
  description: "Chat with your vector collections in natural language.",
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
