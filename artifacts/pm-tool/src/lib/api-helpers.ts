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
