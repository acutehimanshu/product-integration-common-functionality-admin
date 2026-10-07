import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Who can use this portal, and with which roles. */
export const adminsModule: AdminModule = {
  id: "admins",
  name: "Admin accounts",
  routes: ["/admins"],
  nav: [
    { slot: "sidebar", href: "/admins", label: t("nav.admin.adminAccounts"), order: 100 },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "super",
  load: () => import("@/modules/admins/page"),
}
