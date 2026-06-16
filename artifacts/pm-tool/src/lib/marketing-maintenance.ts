/** Build-time flag: when true, marketing routes show the maintenance screen. */
export function isMarketingMaintenanceMode(): boolean {
  const raw = import.meta.env.VITE_MARKETING_MAINTENANCE;
  if (raw === undefined || raw === "") return false;
  return raw === "true" || raw === "1";
}
