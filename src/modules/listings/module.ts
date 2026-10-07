import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Reported and rule-flagged listings; prohibited items. */
export const listingsModule: AdminModule = {
  id: "listings",
  name: "Listing moderation",
  routes: ["/listings"],
  nav: [
    {
      slot: "sidebar",
      href: "/listings",
      label: t("nav.admin.listingModeration"),
      order: 30,
    },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "listings",
  load: () => import("@/modules/listings/page"),
}
