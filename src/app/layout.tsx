import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StoryForge AI | AI-Powered Video Generation",
  description: "Create stunning videos automatically with AI. Write stories, generate narration, and produce professional videos in minutes.",
  keywords: ["AI video", "story generator", "video creation", "AI narration", "content creation"],
  authors: [{ name: "StoryForge AI" }],
  openGraph: {
    title: "StoryForge AI | AI-Powered Video Generation",
    description: "Create stunning videos automatically with AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-grid`}>
        {/* Ambient background effects */}
        <div className="bg-radial-glow fixed inset-0 pointer-events-none z-0" />
        <div className="bg-noise" />
        
        {/* Main content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
