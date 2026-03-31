import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { cartographer } from "@replit/vite-plugin-cartographer";
import { devBanner } from "@replit/vite-plugin-dev-banner";

function normalizeBasePath(input: string): string {
  if (!input.trim()) return "/";
  let value = input.trim();
  if (!value.startsWith("/")) value = `/${value}`;
  if (!value.endsWith("/")) value = `${value}/`;
  return value;
}

// Safer defaults:
// - dev: "/"
// - production: "/pm/"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");

  const rawPort = env.PORT;
  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = normalizeBasePath(
    env.BASE_PATH ??
      (mode === "production" ? "/pm/" : "/"),
  );

  console.log("[vite] NODE_ENV=", mode);
  console.log("[vite] BASE_PATH(raw)=", env.BASE_PATH);
  console.log("[vite] basePath(normalized)=", basePath);

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(mode !== "production" && env.REPL_ID !== undefined
        ? [
            cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
            devBanner(),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      // In local dev (not on Replit) proxy /api to the API server
      ...(env.REPL_ID
        ? {}
        : {
            proxy: {
              "/api": {
                target: `http://localhost:${env.API_PORT ?? 8080}`,
                changeOrigin: true,
              },
            },
          }),
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
