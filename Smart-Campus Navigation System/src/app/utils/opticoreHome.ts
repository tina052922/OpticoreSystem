/**
 * URL for the Opticore landing / home entry.
 * Deployed beside Next (`/campus-navigation-standalone.html`): `/` is correct for prod builds.
 * Local Vite (`5173`): default to Next dev (`3000`) so "Back to Opticore" leaves the kiosk SPA.
 * Override anytime: `VITE_OPTICORE_HOME` in `.env.local`.
 */
export function getOpticoreLandingHref(): string {
  const raw =
    typeof import.meta.env.VITE_OPTICORE_HOME === 'string' ? import.meta.env.VITE_OPTICORE_HOME.trim() : '';
  if (raw.length) return raw.replace(/\/+$/, '') || '/';
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '/';
}
