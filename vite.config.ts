/// <reference types="vitest/config" />
import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { coverage } from "@acutehimanshu/config/coverage"
import { defineConfig } from "vite"

// The admin portal is a plain React single-page app: no server, no SEO. It
// builds to static files (dist/) that any static host can serve, with every
// unknown path falling back to index.html (client-side routing).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: { port: 3400, strictPort: true },
  preview: { port: 3400, strictPort: true },
  build: {
    // React, the router, forms and the UI kit: ~170 kB gzipped, fine for an
    // internal tool (each section is its own lazy chunk on top).
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      onwarn(warning, warn) {
        // The shared @acutehimanshu/ui files carry "use client" for the Next
        // portals; it means nothing here.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return
        warn(warning)
      },
    },
  },
  test: {
    coverage: coverage({ lines: 22, functions: 14, branches: 15, statements: 21 }),
    environment: "jsdom",
    // Tests must not depend on a local .env.local (CI and fresh clones have none).
    env: { VITE_API_BASE_URL: "http://localhost:3100" },
    // Typing whole forms with user-event is slow under coverage on CI runners.
    testTimeout: 15_000,
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
})
