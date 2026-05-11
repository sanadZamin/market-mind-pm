/**
 * Helper to inject the Bearer token into generated orval hooks.
 * Typed as Record<string, string> so unions like `{ Authorization?: undefined }` are not inferred
 * (those break RequestInit / CustomFetchOptions).
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("pm_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAuthRequest = (): { headers: Record<string, string> } => ({
  headers: getAuthHeaders(),
});

/** Same base as `setBaseUrl` + `/api` — use for raw `fetch` calls. */
export function getApiRoot(): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return base ? `${base}/api` : "/api";
}
