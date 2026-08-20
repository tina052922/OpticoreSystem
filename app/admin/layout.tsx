export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  /* Role-specific shell (CampusIntelligenceShell) lives in college/cas/gec route layouts. */
  return <>{children}</>;
}
