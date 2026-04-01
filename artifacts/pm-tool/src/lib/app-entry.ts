const DEFAULT_SIGN_IN_SEGMENT = "mm-workbench";

/**
 * Path segment for sign-in (no leading/trailing slashes). Build-time: VITE_PM_SIGNIN_PATH.
 */
export function getSignInPathSegment(): string {
  const raw = import.meta.env.VITE_PM_SIGNIN_PATH;
  const trimmed = typeof raw === "string" ? raw.trim().replace(/^\/+|\/+$/g, "") : "";
  if (!trimmed) return DEFAULT_SIGN_IN_SEGMENT;
  return trimmed.split("/").filter(Boolean)[0] ?? DEFAULT_SIGN_IN_SEGMENT;
}

/** Location + href prefix for wouter, e.g. `/mm-workbench`. */
export function getSignInPath(): string {
  return `/${getSignInPathSegment()}`;
}
