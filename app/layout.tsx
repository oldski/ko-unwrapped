import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import SyncProvider from "@/components/SyncProvider";
import ColorThemeProvider from "@/components/ColorThemeProvider";
import AmbientLayer from "@/components/AmbientLayer";
import Hero from "@/components/Hero";
import NowPlaying from "@/components/NowPlaying";
import Navigation from "@/components/Interface/Navigation";
import VisualizationLayer from "@/components/VisualizationLayer";
import VisualizerBlurOverlay from "@/components/VisualizerBlurOverlay";
import FABContainer from "@/components/FABContainer";
import PageTransition from "@/components/PageTransition";
import { VisualizerProvider } from "@/contexts/VisualizerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { GoogleAnalytics } from "@next/third-parties/google";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const enableAnalytics = process.env.NODE_ENV === "production" && !!GA_ID;

const jetbrainsMono = localFont({
  src: [
    {
      path: "../public/fonts/JetBrainsMono/JetBrainsMono-Variable.woff2",
      weight: "100 800",
      style: "normal",
    },
    {
      path: "../public/fonts/JetBrainsMono/JetBrainsMono-VariableItalic.woff2",
      weight: "100 800",
      style: "italic",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/*
 * Display face. Anybody carries width (50-150) and weight (100-900) axes, so
 * headlines can be set genuinely condensed rather than just large. JetBrains
 * Mono stays the voice for data, labels and UI; this exists to give headings
 * and feature figures a register the mono cannot reach.
 */
const anybody = localFont({
  src: [
    {
      path: "../public/fonts/Anybody/Anybody-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-anybody",
  display: "swap",
});

export const metadata: Metadata = {
  title: "oldski unwrapped",
  description: "A fun project diving into Spotify's API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
	
	const ambianceLevel = (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
	
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} ${jetbrainsMono.variable} ${anybody.variable} palette-transition`}>
        <ColorThemeProvider>
          <ErrorBoundary componentName="App Root">
            <VisualizerProvider>
              <ErrorBoundary
                componentName="Visualizers"
                fallback={<div className="fixed inset-0 bg-gray-900/50" />}
              >
                <VisualizationLayer />
              </ErrorBoundary>

              <VisualizerBlurOverlay />

              <SyncProvider>
                <ErrorBoundary
                  componentName="Navigation"
                  fallback={<div className="h-16 bg-gray-900" />}
                >
                  <Navigation />
                </ErrorBoundary>

                <ErrorBoundary componentName="Hero">
                  <Hero />
                </ErrorBoundary>

                <ErrorBoundary componentName="Now Playing">
                  <NowPlaying />
                </ErrorBoundary>

                <div className="relative z-10">
                  <ErrorBoundary componentName="Page Content">
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </ErrorBoundary>
                </div>

                {/*<FABContainer />*/}
              </SyncProvider>

              <ErrorBoundary
                componentName="Ambient Layer"
                fallback={<div />}
              >
                <AmbientLayer variant={ambianceLevel} />
              </ErrorBoundary>
            </VisualizerProvider>
          </ErrorBoundary>
        </ColorThemeProvider>
        {enableAnalytics && <GoogleAnalytics gaId={GA_ID!} />}
      </body>
    </html>
  );
}
