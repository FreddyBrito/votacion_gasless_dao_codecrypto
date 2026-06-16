import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAO Gasless Voting",
  description: "DAO with gasless voting using EIP-2771 meta-transactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black">{children}</body>
    </html>
  );
}
