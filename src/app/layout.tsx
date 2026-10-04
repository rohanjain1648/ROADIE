import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Unbounded({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "800"] });

export const metadata: Metadata = {
  title: "ROADIE — the AI tour manager that knows where your fans are",
  description:
    "An agentic tour planner grounded in Qloo's 250M+ entity taste graph: affinity heatmaps, venues your fans love, openers, brand partners and city-tuned promo.",
};

export const viewport: Viewport = { themeColor: "#08080a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
