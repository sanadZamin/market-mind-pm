import { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML.trim()) {
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111827;color:#fff;padding:24px;">
      <div style="max-width:900px;border:1px solid rgba(59,130,246,.6);background:rgba(30,58,138,.25);padding:16px;border-radius:8px;">
        <h1 style="margin:0 0 8px 0;font-size:18px;">Bootstrapping frontend...</h1>
        <p style="margin:0;font-size:13px;line-height:1.45;opacity:.92;">If this message stays for more than a few seconds, app mount is failing.</p>
      </div>
    </div>
  `;
}

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

function showFatalError(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050807;color:#fff;padding:24px;">
      <div style="max-width:900px;border:1px solid rgba(239,68,68,.6);background:rgba(127,29,29,.3);padding:16px;border-radius:8px;">
        <h1 style="margin:0 0 8px 0;font-size:18px;">Frontend bootstrap error</h1>
        <pre style="white-space:pre-wrap;word-break:break-word;margin:0;font-size:13px;line-height:1.45;">${message}</pre>
      </div>
    </div>
  `;
}

window.addEventListener("error", (event) => {
  const err = event.error;
  const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : event.message;
  showFatalError(`Global runtime error:\n${message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? `${reason.message}\n\n${reason.stack ?? ""}` : String(reason);
  showFatalError(`Unhandled promise rejection:\n${message}`);
});

async function bootstrap() {
  try {
    const mountTimeout = window.setTimeout(() => {
      showFatalError("Frontend bootstrap timeout: app did not mount within 8 seconds.");
    }, 8000);
    const { default: App } = await import("./App");
    createRoot(document.getElementById("root")!).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
    window.clearTimeout(mountTimeout);
  } catch (error) {
    const message = error instanceof Error ? `${error.message}\n\n${error.stack ?? ""}` : String(error);
    console.error("Bootstrap import error:", error);
    showFatalError(message);
  }
}

void bootstrap();
