import { getSignInPath } from "@/lib/app-entry";

const STORAGE_KEY = "pm_auth_return_to";

/** Persist current browser path so we can return after sign-in (e.g. email deep links). */
export function storeAuthRedirectIntent(): void {
  try {
    const path = window.location.pathname + window.location.search + window.location.hash;
    if (!path) return;
    const sign = getSignInPath();
    if (path === sign || path.endsWith(sign) || path.includes(sign + "?")) return;
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Path suitable for wouter `setLocation` (strip Vite `base`, reject sign-in target).
 * Returns null if nothing stored or unsafe.
 */
export function consumeReturnToWouterPath(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const noHash = raw.split("#")[0] ?? raw;
    if (!noHash.startsWith("/")) return null;
    if (noHash.startsWith("//")) return null;

    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    let p = noHash;
    if (base && base !== "/" && p.startsWith(base)) {
      p = p.slice(base.length) || "/";
    }
    if (!p.startsWith("/")) p = `/${p}`;

    const sign = getSignInPath();
    if (p === sign || p.startsWith(`${sign}?`)) return null;

    return p;
  } catch {
    return null;
  }
}
