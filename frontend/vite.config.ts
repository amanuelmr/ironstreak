import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      // dashboard.html is opened at runtime (not referenced by the manifest),
      // so register it explicitly as a build entry. Path is relative to root.
      input: { dashboard: "dashboard.html" },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
