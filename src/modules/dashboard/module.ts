import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Queues that need someone today, and the marketplace's numbers. */
export const dashboardModule: AdminModule = {
  id: "dashboard",
  name: "Dashboard",
  routes: ["/"],
  nav: [{ slot: "sidebar", href: "/", label: t("nav.admin.dashboard"), order: 0 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "any",
  required: true,
  load: () => import("@/modules/dashboard/page"),
}
