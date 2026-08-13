import "./globals.css";
import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NextTalent | Voice-Activated Career Ecosystem",
  description:
    "AI-powered career guidance platform featuring voice-to-roadmap generation, skill gap analysis, micro-learning recommendations, and workforce analytics.",
  keywords:
    "career guidance, AI, voice assistant, skill gap, talent ecosystem",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
