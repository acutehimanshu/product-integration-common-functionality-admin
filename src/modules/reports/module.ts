import type { AdminModule } from "@/modules/types"
import { t } from "@acutehimanshu/ui/i18n"

/** Reports with filters, CSV and scheduled runs; each report follows its own section's access. */
export const reportsModule: AdminModule = {
  id: "reports",
  name: "Reports",
  routes: ["/reports"],
  nav: [{ slot: "sidebar", href: "/reports", label: t("nav.admin.reports"), order: 95 }],
  // Every admin can open it; the backend lists only the reports their sections allow.
  section: "any",
  load: () => import("@/modules/reports/page"),
}
