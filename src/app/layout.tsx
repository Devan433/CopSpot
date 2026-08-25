import type { Metadata, Viewport } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";
import "leaflet/dist/leaflet.css";



export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d2137",
};

export const metadata: Metadata = {
  title: "CopSpot - Community Radar",
  description: "Community-driven cop spotter and reporting network for Kerala. Report sightings, verify reports, and stay informed in real-time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CopSpot",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body
        className="antialiased bg-[#0a1628] text-white"
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
