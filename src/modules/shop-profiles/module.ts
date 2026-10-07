import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Sellers' public shop profiles: reported ones first; hide, reset or show a field. */
export const shopProfilesModule: AdminModule = {
  id: "shop-profiles",
  name: "Shop profiles",
  routes: ["/shop-profiles"],
  nav: [
    {
      slot: "sidebar",
      href: "/shop-profiles",
      label: t("nav.admin.shopProfiles"),
      order: 36,
    },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "shop-profiles",
  load: () => import("@/modules/shop-profiles/page"),
}
