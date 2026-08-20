/** Save the last visited pathname so login page can redirect back. */
const LAST_PATH_KEY = "last_visited_path";

export function saveLastPath(path: string) {
  if (typeof window === "undefined") return;

  if (
    path === "/campus-navigation" ||
    path === "/campus-navigation-standalone.html"
  )
    return;

  try {
    localStorage.setItem(LAST_PATH_KEY, path);
    document.cookie = `${LAST_PATH_KEY}=${encodeURIComponent(path)}; path=/; max-age=300; SameSite=Lax`;
  } catch {
    /* quota exceeded */
  }
}

export function getLastPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_PATH_KEY);
  } catch {
    return null;
  }
}

export function clearLastPath() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_PATH_KEY);
    document.cookie = `${LAST_PATH_KEY}=; path=/; max-age=0`;
  } catch {
    /* ignore */
  }
}
