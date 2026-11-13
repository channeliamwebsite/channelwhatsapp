import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Channeliam WhatsApp Hub",
    template: "%s · Channeliam WhatsApp Hub",
  },
  description: "Internal workspace for Channeliam WhatsApp campaigns, conversations and contacts.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#260D12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
