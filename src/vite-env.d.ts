/// <reference types="vite/client" />

// The VITE_* values this app reads (validated in src/lib/env.ts).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MODULES_OFF?: string
  readonly VITE_MODULES_ON?: string
}
