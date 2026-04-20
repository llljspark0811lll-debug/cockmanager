import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
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

const siteTitle = "콕매니저🏸";
const siteDescription = "배드민턴 클럽 운영 관리 프로그램";

function getMetadataBase() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://badminton-club-web.vercel.app");

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL("https://badminton-club-web.vercel.app");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: siteTitle,
  description: siteDescription,
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
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
    ],
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
      <head>
        {/* React 하이드레이션 전에 PC에서 브라우저 기본 설치 프롬프트를 차단 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener('beforeinstallprompt',function(e){if(!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)){e.preventDefault();}});})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaInstallPrompt />
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
