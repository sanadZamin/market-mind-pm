import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Intercept every fetch — if the server returns 401 and the user has a
// stored token (i.e. a session that expired), broadcast an event so the
// AuthProvider can log them out automatically.
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const response = await _origFetch(...args);
  console.log("[runtime] BASE_URL =", import.meta.env.BASE_URL);
console.log("[runtime] pathname =", window.location.pathname);
  if (response.status === 401 && localStorage.getItem("pm_token")) {
    window.dispatchEvent(new Event("auth:expired"));
  }

  return response;
};

createRoot(document.getElementById("root")!).render(<App />);
