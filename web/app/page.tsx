import { PublicLandingPage } from "@/components/landing/PublicLandingPage";

/** Public landing — unauthenticated users (see middleware: `/` is not redirected to login). */
export default function Home() {
  return <PublicLandingPage />;
}
