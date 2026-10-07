import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Seller payouts, held payouts, platform fees and refunds. */
export const payoutsModule: AdminModule = {
  id: "payouts",
  name: "Payouts",
  routes: ["/payouts"],
  nav: [{ slot: "sidebar", href: "/payouts", label: t("nav.admin.payouts"), order: 60 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "payouts",
  load: () => import("@/modules/payouts/page"),
}
