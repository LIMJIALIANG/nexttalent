import "./globals.css";
import { ReactNode } from "react";
import { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "NextTalent | Voice-Activated Career Ecosystem",
  description:
    "AI-powered career guidance platform featuring voice-to-roadmap generation, skill gap analysis, micro-learning recommendations, and workforce analytics.",
  keywords:
    "career guidance, AI, voice assistant, skill gap, talent ecosystem",
  icons: {
    icon: [
      {
        url: "/nexttalent-logo/nexttalent-logo-only-dark.png",
        type: "image/png",
      },
    ],
    shortcut: "/nexttalent-logo/nexttalent-logo-only-dark.png",
    apple: "/nexttalent-logo/nexttalent-logo-only-dark.png",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="icon"
          href="/nexttalent-logo/nexttalent-logo-only-dark.png"
          type="image/png"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
