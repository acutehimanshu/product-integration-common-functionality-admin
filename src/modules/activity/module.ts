import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Everything every admin did, from login to logout (the super admin only). */
export const activityModule: AdminModule = {
  id: "activity",
  name: "Activity log",
  routes: ["/activity"],
  nav: [
    { slot: "sidebar", href: "/activity", label: t("nav.admin.activityLog"), order: 105 },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "super",
  load: () => import("@/modules/activity/page"),
}
