import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Sellers the payment partner couldn't verify automatically. */
export const sellersModule: AdminModule = {
  id: "sellers",
  name: "Seller verification",
  routes: ["/sellers"],
  nav: [
    {
      slot: "sidebar",
      href: "/sellers",
      label: t("nav.admin.sellerVerification"),
      order: 20,
    },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "sellers",
  load: () => import("@/modules/sellers/page"),
}
