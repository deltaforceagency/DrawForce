import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DrawForce — Your Creative Command Center",
  description:
    "A premium whiteboard and knowledge workspace. Organize like Obsidian, create like Excalidraw.",
  openGraph: {
    title: "DrawForce — Your Creative Command Center",
    description:
      "A premium whiteboard and knowledge workspace. Organize like Obsidian, create like Excalidraw.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-[#f5f5f5]">
        {children}
      </body>
    </html>
  );
}
