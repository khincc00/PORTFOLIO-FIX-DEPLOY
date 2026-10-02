import type { Metadata, Viewport } from "next";
import PublicApp from "./PublicApp";
export const metadata: Metadata = {
  title: "Khincc Pocket",
  description: "Karya dan cerita terbaru dari Khincc Studio.",
  manifest: "/pocket.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Khincc Pocket",
    statusBarStyle: "default",
  },
  icons: { apple: "/pwa/icon-192.png" },
  alternates: { canonical: "/app" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f6f2",
};
export default function Page() {
  return <PublicApp />;
}
