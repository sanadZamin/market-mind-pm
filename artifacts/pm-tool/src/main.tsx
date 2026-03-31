import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In subpath deployments (e.g. /pm), prepend that base to API calls so
// generated paths like /api/... become /pm/api/...
const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(appBase && appBase !== "/" ? appBase : null);

// Intercept every fetch — if the server returns 401 and the user has a
// stored token (i.e. a session that expired), broadcast an event so the
// AuthProvider can log them out automatically.
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const response = await _origFetch(...args);
  if (response.status === 401 && localStorage.getItem("pm_token")) {
    window.dispatchEvent(new Event("auth:expired"));
  }

  return response;
};

createRoot(document.getElementById("root")!).render(<App />);
