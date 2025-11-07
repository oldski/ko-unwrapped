import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SyncProvider from "@/components/SyncProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "oldski unwrapped",
  description: "A fun project diving into Spotify's API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SyncProvider>
          {children}
        </SyncProvider>
      </body>
    </html>
  );
}
