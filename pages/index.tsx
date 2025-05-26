import Head from "next/head";
import ChatInterface from "../components/chat-interface";

export default function Home() {
  return (
    <>
      <Head>
        <title>Yearn - Natural Language Query Interface</title>
        <meta
          name="description"
          content="Ask questions about your vector collections in plain English"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="h-screen w-screen bg-gray-900 overflow-hidden">
        <ChatInterface />
      </main>
    </>
  );
}
