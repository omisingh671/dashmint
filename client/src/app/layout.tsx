import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DashMint - Dynamic Super Admin Dashboard Generator SaaS",
  description: "DashMint lets you connect MySQL databases, configure visibility, and assign access-controlled dynamic dashboards to team members.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-main text-text-main">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
