import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

// Self-hosted by next/font at build time: no Google Fonts round-trip, no
// render-blocking <link>, no layout shift.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://element-snapper.pakool.com"),
  title: {
    default: "Element Snapper | Pixel-Perfect Chrome Extension",
    template: "Element Snapper | %s",
  },
  description:
    "A professional Chrome extension that captures pixel-perfect screenshots of any webpage element using advanced capture+crop techniques.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Background Effects */}
        <div className="bg-glow" aria-hidden="true">
          <div className="glow glow-1" />
          <div className="glow glow-2" />
        </div>

        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
