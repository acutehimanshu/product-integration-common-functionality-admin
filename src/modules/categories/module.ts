import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** The category tree and each category's suggested details. */
export const categoriesModule: AdminModule = {
  id: "categories",
  name: "Categories",
  routes: ["/categories"],
  nav: [
    { slot: "sidebar", href: "/categories", label: t("nav.admin.categories"), order: 70 },
  ],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "categories",
  load: () => import("@/modules/categories/page"),
}
