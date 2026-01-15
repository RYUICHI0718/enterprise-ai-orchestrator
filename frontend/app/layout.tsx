import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "お客様サポート",
  description: "自動応答チャットボット",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
