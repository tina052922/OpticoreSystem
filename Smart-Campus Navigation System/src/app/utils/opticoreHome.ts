/**
 * URL for the Opticore landing / home entry.
 * Deployed beside Next (`/campus-navigation-standalone.html`): `/` is correct.
 * For local Vite only (`5173`), set `VITE_OPTICORE_HOME=http://localhost:3000` in `.env.local`.
 */
export function getOpticoreLandingHref(): string {
  const raw =
    typeof import.meta.env.VITE_OPTICORE_HOME === 'string' ? import.meta.env.VITE_OPTICORE_HOME.trim() : '';
  if (!raw.length) return '/';
  return raw.replace(/\/+$/, '') || '/';
}
