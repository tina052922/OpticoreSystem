import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptiCore – CTU Argao",
  description: "OptiCore: Campus Intelligence System – CTU Argao",
  icons: { icon: "/login/ctu-logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

