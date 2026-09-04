import type { Metadata, Viewport } from "next";
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";
import { PathSaver } from "@/components/PathSaver";
import { OpticoreToastProvider } from "@/components/alerts/OpticoreToastProvider";
import { CampusBrandingProvider } from "@/contexts/CampusBrandingContext";
import { ConnectionToastsMount } from "@/components/alerts/ConnectionToastsMount";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptiCore – CTU Argao",
  description: "OptiCore: Campus Intelligence System – CTU Argao",
  icons: { icon: "/login/ctu-logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#780301",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <OpticoreToastProvider>
          <CampusBrandingProvider>
          <ConnectionToastsMount />
          <ChunkLoadRecovery />
          <PathSaver />
          {children}
          </CampusBrandingProvider>
        </OpticoreToastProvider>
      </body>
    </html>
  );
}

