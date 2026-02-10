import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setter - AI-Powered Lead Management",
  description: "Real-time AI coaching for every message, every lead, every deal.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-gray-50">
        {children}
      </body>
    </html>
  );
}
