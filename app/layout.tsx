import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Draftr",
    template: "%s | Draftr",
  },
  description: "Draftr is a focused workspace for PDF and Markdown conversion, editing, compression, OCR, and AI-assisted rewrites.",
  openGraph: {
    title: "Draftr",
    description: "A dark document workspace for PDF and Markdown conversion, editing, compression, OCR, and AI-assisted rewrites.",
    siteName: "Draftr",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Draftr document workspace preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Draftr",
    description: "A focused document workspace for PDF and Markdown conversion, editing, compression, OCR, and AI-assisted rewrites.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-black text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
