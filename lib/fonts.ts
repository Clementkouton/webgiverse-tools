// lib/fonts.ts
import { Inter, Space_Grotesk } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"], variable: "--font-inter", display: "swap",
});
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"], weight: ["500", "600", "700"],
  variable: "--font-space-grotesk", display: "swap",
});