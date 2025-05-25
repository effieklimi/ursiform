import Head from "next/head";
import ChatInterface from "../components/chat-interface";

export default function Home() {
  return (
    <>
      {/* <Head>
        <title>Yearn - Natural Language Query Interface</title>
        <meta
          name="description"
          content="Ask questions about your vector collections in plain English"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head> */}
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Yearn - Natural Language Query Interface
            </h1>
            <p className="text-lg text-gray-600">
              Ask questions about your vector collections in plain English
            </p>
          </div> */}
          <ChatInterface />
        </div>
      </main>
    </>
  );
}
