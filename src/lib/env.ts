import { z } from "zod"

// The only place import.meta.env is read. Vite inlines VITE_* values at
// build time, so a change means a rebuild.
const envSchema = z.object({
  // The backend — the real one, or the dev mock (apps/mock-api, :3100).
  VITE_API_BASE_URL: z.string().url(),
  // Per-build module overrides, comma lists (src/modules/index.ts).
  VITE_MODULES_OFF: z.string().optional(),
  VITE_MODULES_ON: z.string().optional(),
})

const parsed = envSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_MODULES_OFF: import.meta.env.VITE_MODULES_OFF,
  VITE_MODULES_ON: import.meta.env.VITE_MODULES_ON,
})

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
  )
}

export const env = {
  ...parsed.data,
  VITE_API_BASE_URL: parsed.data.VITE_API_BASE_URL.replace(/\/$/, ""),
}
