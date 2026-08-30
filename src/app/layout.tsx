import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AlphaStack — Crypto Intelligence OS",
    template: "%s · AlphaStack",
  },
  description:
    "Seven crypto intelligence modules, one agent-first platform. Capitulation scoring, leverage crowding, thesis screening, exit rules, contract security, KOL accountability and catalyst tracking.",
  keywords: [
    "crypto intelligence",
    "bitcoin analytics",
    "liquidation heatmap",
    "smart contract security",
    "crypto screener",
    "MCP server",
  ],
  openGraph: {
    title: "AlphaStack — Crypto Intelligence OS",
    description: "Seven modules. One agent. Every number traceable to a tool call.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body
        style={
          {
            "--font-sans": "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            "--font-mono": "var(--font-jetbrains), ui-monospace, monospace",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
