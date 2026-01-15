"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ChatWindow from "./components/ChatWindow";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const isLine = searchParams.get('source') === 'line';

  const lineWelcomeMessage = "LINEからのお問い合わせありがとうございます。\nこちらでより詳しいご案内をいたします。お知りになりたい内容を入力してください。";

  return (
    <main className="flex-1 flex gap-4 p-4 h-[calc(100vh-64px)] overflow-hidden items-stretch">
      {/* Left Side: Selection Mode */}
      <div className="flex-1 flex flex-col min-w-0 shadow-lg rounded-xl overflow-hidden animate-slide-in-left">
        <ChatWindow
          mode="selection"
          title="選択型（人が選択）"
          initialMessage="お問い合わせありがとうございます。お知りになりたい内容を選択してください。"
        />
      </div>

      {/* Right Side: Conversation Mode */}
      <div className="flex-1 flex flex-col min-w-0 shadow-lg rounded-xl overflow-hidden animate-slide-in-right">
        <ChatWindow
          mode="conversation"
          title="会話型（AIがナビゲート）"
          initialMessage={isLine ? lineWelcomeMessage : "お知りになりたい内容を入力してください。"}
          initialOptions={[]}
        />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
