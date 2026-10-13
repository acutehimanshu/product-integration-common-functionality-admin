import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/**
 * Scoped rules: global settings changed per country, category, seller type or
 * seller. Its own section (FRD-02 CFG-052), so sub-admins can author rules
 * and another admin can approve them.
 */
export const rulesModule: AdminModule = {
  id: "rules",
  name: "Rules",
  routes: ["/rules"],
  nav: [{ slot: "sidebar", href: "/rules", label: t("nav.admin.rules"), order: 89 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "rules",
  load: () => import("@/modules/rules/page"),
}
