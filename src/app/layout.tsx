import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

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
      </head>
      <body
        className={`${pressStart.variable} ${vt323.variable} antialiased bg-[#0a1628] text-white`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
