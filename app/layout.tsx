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
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden bg-page text-ink antialiased">{children}</body>
    </html>
  );
}
