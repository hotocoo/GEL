import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "GEL - Gamified Learning Platform",
  description: "Master subjects through interactive lessons, RPG-style progression, and adaptive challenges.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
