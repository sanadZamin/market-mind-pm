import { Component, ReactNode } from "react";
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

type ErrorBoundaryState = { hasError: boolean; message?: string };

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown runtime error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Runtime render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#050807] text-white flex items-center justify-center p-6">
          <div className="max-w-2xl rounded-lg border border-red-500/40 bg-red-900/20 p-4">
            <h1 className="text-lg font-semibold text-red-300">Frontend runtime error</h1>
            <p className="mt-2 text-sm text-red-100/90 break-all">{this.state.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
