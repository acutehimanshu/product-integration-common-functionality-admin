import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Packages, credit packs, credit costs, the on/off switches, and who's subscribed. */
export const subscriptionsModule: AdminModule = {
  id: "subscriptions",
  name: "Subscriptions",
  routes: ["/subscriptions"],
  nav: [
    {
      slot: "sidebar",
      href: "/subscriptions",
      label: t("nav.admin.subscriptions"),
      order: 65,
    },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "subscriptions",
  load: () => import("@/modules/subscriptions/page"),
}
