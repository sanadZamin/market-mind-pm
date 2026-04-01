/**
 * Helper to inject the Bearer token into generated orval hooks.
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('pm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAuthRequest = () => ({
  headers: getAuthHeaders()
});

/** Same base as `setBaseUrl` + `/api` — use for raw `fetch` calls. */
export function getApiRoot(): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return base ? `${base}/api` : "/api";
}
