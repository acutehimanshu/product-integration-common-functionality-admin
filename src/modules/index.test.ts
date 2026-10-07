import { describe, expect, it } from "vitest"
import {
  ADMIN_SECTIONS,
  noPermissions,
  presetPermissions,
  type AdminPermissions,
} from "@acutehimanshu/core/domain/admin"
import {
  accessToModule,
  canUseModule,
  enabledModules,
  modules,
  sidebarFor,
} from "@/modules"

const sub = (permissions: AdminPermissions) => ({ isSuperAdmin: false, permissions })
const everything = Object.fromEntries(
  ADMIN_SECTIONS.map((section) => [section, "manage"])
) as AdminPermissions

describe("admin module registry", () => {
  it("gives every module one route and a screen that loads", async () => {
    for (const manifest of enabledModules) {
      expect(manifest.routes, manifest.id).toHaveLength(1)
      const screen = await manifest.load()
      expect(typeof screen.default, manifest.id).toBe("function")
    }
  }, 60_000) // imports every screen (slow under coverage and parallel runs)

  it("links each module's sidebar entry to its own route", () => {
    for (const item of modules.nav("sidebar")) {
      expect(modules.ownerOf(item.href)?.routes).toContain(item.href)
    }
  })

  it("shows each sub-admin only the sections they were given", () => {
    const labels = (permissions: AdminPermissions) =>
      sidebarFor(sub(permissions)).map((item) => item.label)

    expect(labels(presetPermissions("trust_safety"))).toEqual([
      "Dashboard",
      "Users",
      "Seller verification",
      "Listing moderation",
      "Reviews",
      "Shop profiles",
      "Reports",
    ])
    expect(labels(presetPermissions("finance"))).toEqual([
      "Dashboard",
      "Payouts",
      "Subscriptions",
      "Reports",
    ])
    // View only still shows the section.
    expect(labels({ ...noPermissions(), orders: "view" })).toEqual([
      "Dashboard",
      "Orders",
      "Reports",
    ])
    // Reports is for everyone; it lists only what their sections allow.
    expect(labels(noPermissions())).toEqual(["Dashboard", "Reports"])
  })

  it("gives the super admin everything, including the activity log", () => {
    const labels = sidebarFor({ isSuperAdmin: true, permissions: everything }).map(
      (item) => item.label
    )
    expect(labels).toHaveLength(enabledModules.length)
    expect(labels).toContain("Activity log")
  })

  it("keeps settings, admin accounts and the activity log to the super admin", () => {
    const fullSub = sub(everything)
    for (const id of ["settings", "admins", "activity"] as const) {
      expect(canUseModule(fullSub, id), id).toBe(false)
      expect(canUseModule({ isSuperAdmin: true, permissions: everything }, id), id).toBe(
        true
      )
    }
  })

  it("passes the section's level through", () => {
    const viewer = sub({ ...noPermissions(), payouts: "view", orders: "manage" })
    expect(accessToModule(viewer, "payouts")).toBe("view")
    expect(accessToModule(viewer, "orders")).toBe("manage")
    expect(accessToModule(viewer, "users")).toBe("none")
    expect(accessToModule(viewer, "dashboard")).toBe("manage")
  })
})
