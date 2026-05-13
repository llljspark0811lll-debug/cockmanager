import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRegistrar from "@/components/PwaRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://cockmanager.kr";
const siteTitle = "콕매니저 | 배드민턴 자동대진 · 클럽/소모임 운영 관리";
const siteDescription =
  "배드민턴 클럽/소모임을 위한 자동대진, 회원 관리, 출석 체크, 월회비 관리 프로그램. 총무 업무를 클릭 한 번으로 해결하세요.";

function getMetadataBase() {
  return new URL(siteUrl);
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "배드민턴 자동대진",
    "배드민턴 대진표",
    "배드민턴 클럽 관리",
    "배드민턴 소모임 운영",
    "배드민턴 총무 프로그램",
    "배드민턴 회원 관리",
    "배드민턴 회비 관리",
    "콕매니저",
  ],
  applicationName: siteTitle,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteTitle,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
