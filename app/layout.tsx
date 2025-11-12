import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SyncProvider from "@/components/SyncProvider";
import DynamicBackground from "@/components/DynamicBackground";
import AmbientLayer from "@/components/AmbientLayer";
import Hero from "@/components/Hero";
import Navigation from "@/components/Interface/Navigation";
import VisualizationLayer from "@/components/VisualizationLayer";
import FABContainer from "@/components/FABContainer";
import PageTransition from "@/components/PageTransition";
import { VisualizerProvider } from "@/contexts/VisualizerContext";

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
        <DynamicBackground />
        <VisualizerProvider>
          <VisualizationLayer />
          <AmbientLayer />
          <SyncProvider>
            <Navigation />
            <Hero />
            <div className="relative z-10">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
            {/*<FABContainer />*/}
          </SyncProvider>
        </VisualizerProvider>
      </body>
    </html>
  );
}
