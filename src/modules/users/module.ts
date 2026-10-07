import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Find any account; view its orders, listings and history; suspend or restore it. */
export const usersModule: AdminModule = {
  id: "users",
  name: "Users",
  routes: ["/users"],
  nav: [{ slot: "sidebar", href: "/users", label: t("nav.admin.users"), order: 10 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "users",
  load: () => import("@/modules/users/page"),
}
