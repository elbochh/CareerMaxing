import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CareerMaxing — Your daily AI career agent",
  description:
    "A daily AI career operating system for AI students. Discover AI jobs, events, hackathons, and learning paths, scored to your goals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
