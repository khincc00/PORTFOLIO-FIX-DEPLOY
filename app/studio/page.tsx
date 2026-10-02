import type { Metadata, Viewport } from "next";
import StudioClient from "./StudioClient";

export const metadata: Metadata = {
  title: "Studio Mobile",
  manifest: "/studio.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Khincc Studio",
    statusBarStyle: "default",
  },
  icons: { apple: "/pwa/icon-192.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f6f2",
};

export default function Page() {
  return <StudioClient />;
}
