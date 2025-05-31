"use client";

import { trpc } from "./providers/trpc-provider";

export function TestTRPC() {
  const { data: chatCount, isLoading } = trpc.chat.getCount.useQuery();
  const { data: messageCount } = trpc.message.getCount.useQuery();
  const { data: chats } = trpc.chat.getAll.useQuery();

  const createChatMutation = trpc.chat.create.useMutation();

  const handleCreateChat = async () => {
    try {
      await createChatMutation.mutateAsync({ title: "Test Chat" });
      // The query will automatically refetch due to React Query
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      {/* <h2 className="text-lg font-bold mb-4">tRPC Test</h2> */}
      <div className="space-y-2">
        <p>Chat Count: {chatCount}</p>
        <p>Message Count: {messageCount}</p>
        <p>Chats: {chats?.length || 0}</p>
        <button
          onClick={handleCreateChat}
          disabled={createChatMutation.isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {createChatMutation.isPending ? "Creating..." : "Create Test Chat"}
        </button>
        {chats && chats.length > 0 && (
          <ul className="mt-4">
            {chats.map((chat) => (
              <li key={chat.id} className="text-sm">
                {chat.title || "Untitled"} -{" "}
                {new Date(chat.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
