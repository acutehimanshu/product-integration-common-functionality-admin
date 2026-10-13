import {
  accessTo,
  type AccessLevel,
  type AdminMe,
} from "@acutehimanshu/core/domain/admin"
import { createModuleRegistry, type ModuleNavItem } from "@acutehimanshu/core/modules"
import { env } from "@/lib/env"
import type { AdminModule, AdminModuleId } from "@/modules/types"
import { dashboardModule } from "@/modules/dashboard/module"
import { usersModule } from "@/modules/users/module"
import { sellersModule } from "@/modules/sellers/module"
import { listingsModule } from "@/modules/listings/module"
import { reviewsModule } from "@/modules/reviews/module"
import { shopProfilesModule } from "@/modules/shop-profiles/module"
import { ordersModule } from "@/modules/orders/module"
import { disputesModule } from "@/modules/disputes/module"
import { payoutsModule } from "@/modules/payouts/module"
import { subscriptionsModule } from "@/modules/subscriptions/module"
import { categoriesModule } from "@/modules/categories/module"
import { contentModule } from "@/modules/content/module"
import { templatesModule } from "@/modules/templates/module"
import { settingsModule } from "@/modules/settings/module"
import { adminsModule } from "@/modules/admins/module"
import { activityModule } from "@/modules/activity/module"
import { reportsModule } from "@/modules/reports/module"
import { rulesModule } from "@/modules/rules/module"

/**
 * The admin portal's modules — the one place to switch a screen on or off.
 *
 * Off means: its routes aren't registered (so they show "Page not found")
 * and its sidebar link disappears. For one build only, use env instead:
 * VITE_MODULES_OFF=content (or VITE_MODULES_ON=…). Separately from on/off, each module's `roles`
 * decide which admins see and may open it.
 *
 * Removing a module for good: delete src/modules/<id>, its pages under
 * src/app, its line here and its id in types.ts.
 */
const switches: Record<AdminModuleId, boolean> = {
  dashboard: true,
  users: true,
  sellers: true,
  listings: true,
  reviews: true,
  "shop-profiles": true,
  orders: true,
  disputes: true,
  payouts: true,
  subscriptions: true,
  categories: true,
  content: true,
  templates: true,
  settings: true,
  admins: true,
  activity: true,
  reports: true,
  rules: true,
}

const manifests: AdminModule[] = [
  dashboardModule,
  usersModule,
  sellersModule,
  listingsModule,
  reviewsModule,
  shopProfilesModule,
  ordersModule,
  disputesModule,
  payoutsModule,
  subscriptionsModule,
  categoriesModule,
  contentModule,
  templatesModule,
  settingsModule,
  adminsModule,
  activityModule,
  reportsModule,
  rulesModule,
]

export const modules = createModuleRegistry<AdminModuleId>(manifests, {
  switches,
  off: env.VITE_MODULES_OFF,
  on: env.VITE_MODULES_ON,
})

const sectionById = new Map(manifests.map((manifest) => [manifest.id, manifest.section]))

type Viewer = Pick<AdminMe, "isSuperAdmin" | "permissions">

/** This admin's level on a module: "none", "view" or "manage". */
export function accessToModule(admin: Viewer, id: AdminModuleId): AccessLevel {
  if (!modules.isEnabled(id)) return "none"
  const section = sectionById.get(id) ?? "super"
  if (section === "any") return "manage"
  if (section === "super") return admin.isSuperAdmin ? "manage" : "none"
  return accessTo(admin, section)
}

/** On, and this admin may at least view it. */
export function canUseModule(admin: Viewer, id: AdminModuleId): boolean {
  return accessToModule(admin, id) !== "none"
}

/** The sidebar links this admin may use. */
export function sidebarFor(admin: Viewer): ModuleNavItem[] {
  return modules.nav("sidebar").filter((item) => {
    const owner = modules.ownerOf(item.href)
    return owner !== undefined && canUseModule(admin, owner.id)
  })
}

/** Enabled modules with everything the router needs (load, section). */
export const enabledModules: AdminModule[] = manifests.filter((manifest) =>
  modules.isEnabled(manifest.id)
)
