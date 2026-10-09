import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootDir, "..");

/**
 * The whole stack reads ONE .env at the project root. Vite normally only looks
 * inside frontend/ and only at VITE_-prefixed keys, so envDir plus an explicit
 * define is what lets `APP_NAME` in that single file rename the product
 * everywhere - receipts, tab title, login screen and sidebar included.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");

  return {
    envDir: projectRoot,
    plugins: [react(), tailwindcss()],
    define: {
      __APP_NAME__: JSON.stringify(env.APP_NAME || "Easy Restaurant"),
      __APP_TAGLINE__: JSON.stringify(env.APP_TAGLINE || "Restaurant Point of Sale"),
      __APP_CURRENCY__: JSON.stringify(env.APP_CURRENCY || "Rs"),
      __APP_PHONE__: JSON.stringify(env.APP_PHONE || ""),
      __APP_ADDRESS__: JSON.stringify(env.APP_ADDRESS || ""),
      __APP_FOOTER_NOTE__: JSON.stringify(env.APP_FOOTER_NOTE || ""),
    },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: `http://localhost:${env.PORT || 5000}`, changeOrigin: true },
      },
    },
  };
});
