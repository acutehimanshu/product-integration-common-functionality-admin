import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Fees, time limits and countries: MarketplaceSettings. */
export const settingsModule: AdminModule = {
  id: "settings",
  name: "Marketplace settings",
  routes: ["/settings"],
  nav: [
    { slot: "sidebar", href: "/settings", label: t("nav.admin.settings"), order: 90 },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "super",
  load: () => import("@/modules/settings/page"),
}
