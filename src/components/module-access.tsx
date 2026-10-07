import { createContext, useContext } from "react"
import type { AccessLevel, AdminMe } from "@acutehimanshu/core/domain/admin"
import { ADMIN_SECTIONS } from "@acutehimanshu/core/domain/admin"

/**
 * The current screen's access level for this admin (set by ModuleScreen).
 * "view": the screen shows, but actions (ReasonDialog and friends) hide —
 * the backend refuses them anyway.
 */
export const ModuleAccessContext = createContext<AccessLevel>("manage")

/** Whether this admin may act (not just look) on the current screen. */
export function useCanAct(): boolean {
  return useContext(ModuleAccessContext) === "manage"
}

/** "Super admin", or how many sections a sub-admin has. */
export function accessSummary(
  admin: Pick<AdminMe, "isSuperAdmin" | "permissions">
): string {
  if (admin.isSuperAdmin) return "Super admin"
  const given = ADMIN_SECTIONS.filter((section) => admin.permissions[section] !== "none")
  return `Admin · ${given.length} section${given.length === 1 ? "" : "s"}`
}
