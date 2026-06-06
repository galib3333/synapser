import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra — Explore the World",
  description: "Discover tourist destinations worldwide with an interactive 3D globe. Click anywhere to explore hidden gems, local food, and cultural landmarks.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
