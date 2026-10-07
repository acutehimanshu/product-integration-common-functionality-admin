import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Legal pages, home page banners and help text. */
export const contentModule: AdminModule = {
  id: "content",
  name: "Content",
  routes: ["/content"],
  nav: [{ slot: "sidebar", href: "/content", label: t("nav.admin.content"), order: 80 }],
  // Who may open it: an admin section the super admin grants per sub-admin,
  // "super" (the super admin only) or "any" (every admin).
  section: "content",
  load: () => import("@/modules/content/page"),
}
