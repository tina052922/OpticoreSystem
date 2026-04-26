import type { Metadata, Viewport } from "next";
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";
import { OpticoreToastProvider } from "@/components/alerts/OpticoreToastProvider";
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
          <ChunkLoadRecovery />
          {children}
        </OpticoreToastProvider>
      </body>
    </html>
  );
}

