import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Reported reviews: hide one (off the seller's page and rating) or restore it. */
export const reviewsModule: AdminModule = {
  id: "reviews",
  name: "Reviews",
  routes: ["/reviews"],
  nav: [{ slot: "sidebar", href: "/reviews", label: t("nav.admin.reviews"), order: 35 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "reviews",
  load: () => import("@/modules/reviews/page"),
}
