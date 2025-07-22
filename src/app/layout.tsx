import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { ToastProvider } from "@/lib/toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { initDbOptimizations } from "@/lib/db-optimization";

// Initialize database optimizations in production
if (process.env.NODE_ENV === "production") {
  initDbOptimizations().catch(console.error);
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Lunch Ordering",
  description: "Order your daily lunch with ease",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lunch Orders",
  },
  icons: {
    icon: [
      {
        url: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        url: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/icons/icon-152x152.svg",
        sizes: "152x152",
        type: "image/svg+xml",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "Daily Lunch Ordering",
    "msapplication-TileColor": "#2563eb",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-152x152.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lunch Orders" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Daily Lunch Ordering" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ToastProvider>
            <AuthSessionProvider>{children}</AuthSessionProvider>
          </ToastProvider>
        </ErrorBoundary>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
