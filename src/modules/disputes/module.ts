import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Problem reports escalated to Marketbase: decide refunds and returns. */
export const disputesModule: AdminModule = {
  id: "disputes",
  name: "Disputes",
  routes: ["/disputes"],
  nav: [
    { slot: "sidebar", href: "/disputes", label: t("nav.admin.disputes"), order: 50 },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "disputes",
  load: () => import("@/modules/disputes/page"),
}
