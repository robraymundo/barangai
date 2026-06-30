import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BarangAI — Decision Intelligence for Smart Communities",
  description:
    "AI-powered Digital Twin and Decision Intelligence Platform helping LGUs simulate projects and policies before spending public funds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
