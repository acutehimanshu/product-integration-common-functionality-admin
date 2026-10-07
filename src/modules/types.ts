import type { AdminSection } from "@acutehimanshu/core/domain/admin"
import type { ComponentType } from "react"
import type { ModuleManifest } from "@acutehimanshu/core/modules"

/** Every module the admin portal knows. Add an id here with its folder. */
export type AdminModuleId =
  | "dashboard"
  | "users"
  | "sellers"
  | "listings"
  | "reviews"
  | "shop-profiles"
  | "orders"
  | "disputes"
  | "payouts"
  | "subscriptions"
  | "categories"
  | "content"
  | "templates"
  | "settings"
  | "admins"
  | "activity"
  | "reports"

/**
 * An admin module also says what grants it (a section the super admin gives
 * each sub-admin, the super admin only, or every admin) and how to load its
 * screen.
 */
export type AdminModule = ModuleManifest<AdminModuleId> & {
  /** What grants it: a section (per sub-admin), the super admin only, or every admin. */
  section: AdminSection | "super" | "any"
  /**
   * The module's screen, loaded on first visit (its own code chunk). It
   * owns everything under its route, so sub-pages (/users/:id) are its own
   * <Routes> — the shell only mounts it.
   */
  load: () => Promise<{ default: ComponentType }>
}

/** Menus modules can add links to. */
export type AdminNavSlot = "sidebar"
