import { TestTRPC } from "../../components/test-trpc";

export default function TestTRPCPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">TRPC Test Page</h1>
      <p className="mb-4 text-gray-600">
        This page tests that TRPC is working correctly with the app directory.
      </p>
      <TestTRPC />
    </div>
  );
}
