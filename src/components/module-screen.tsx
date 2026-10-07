import { Suspense, type ComponentType } from "react"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Forbidden } from "@/components/forbidden"
import { useAdmin } from "@/lib/auth"
import { accessToModule } from "@/modules"
import { ModuleAccessContext } from "@/components/module-access"
import type { AdminModule } from "@/modules/types"

/**
 * Mounts a module's screen if this admin has access to its section, else the
 * "no access" page; with view-only access, actions hide. The backend checks
 * again on every call — this only decides what to show.
 */
export function ModuleScreen({
  module,
  screen: Screen,
}: {
  module: AdminModule
  /** The module's lazy screen (created once, in router.tsx). */
  screen: ComponentType
}) {
  const { data: admin } = useAdmin()
  const level = admin ? accessToModule(admin, module.id) : "none"
  if (level === "none") return <Forbidden />
  return (
    <ModuleAccessContext.Provider value={level}>
      {level === "view" && (
        <p
          role="status"
          className="bg-muted mx-auto mt-4 w-full max-w-6xl rounded-lg px-4 py-2 text-sm"
        >
          View only — you can look but not change anything in this section.
        </p>
      )}
      <Suspense
        fallback={
          <div className="p-6" aria-busy>
            <Skeleton className="h-8 w-48" />
          </div>
        }
      >
        <Screen />
      </Suspense>
    </ModuleAccessContext.Provider>
  )
}
