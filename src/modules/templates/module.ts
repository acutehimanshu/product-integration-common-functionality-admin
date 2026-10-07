import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** The wording of every notification the marketplace sends. */
export const templatesModule: AdminModule = {
  id: "templates",
  name: "Notification templates",
  routes: ["/templates"],
  nav: [
    {
      slot: "sidebar",
      href: "/templates",
      label: t("nav.admin.notificationTemplates"),
      order: 85,
    },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "templates",
  load: () => import("@/modules/templates/page"),
}
