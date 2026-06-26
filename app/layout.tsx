import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Football Betting Intelligence Dashboard",
  description: "Realtime football odds intelligence, risk, EV and portfolio analytics."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
