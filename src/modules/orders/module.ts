import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Look up any order; late shipments; cancel or refund on a user's behalf. */
export const ordersModule: AdminModule = {
  id: "orders",
  name: "Orders",
  routes: ["/orders"],
  nav: [{ slot: "sidebar", href: "/orders", label: t("nav.admin.orders"), order: 40 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "orders",
  load: () => import("@/modules/orders/page"),
}
