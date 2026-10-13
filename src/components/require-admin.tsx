import { Navigate, useLocation } from "react-router"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { useAdmin } from "@/lib/auth"

/**
 * Logged-in admins only; everyone else goes to /login and comes back after.
 * A UX gate — the backend rejects every /admin/* call without a valid
 * session anyway.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { data: admin, isPending, isError } = useAdmin()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" aria-busy>
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }
  if (isError || !admin) {
    const from = location.pathname + location.search
    return (
      <Navigate
        to={from === "/" ? "/login" : `/login?from=${encodeURIComponent(from)}`}
        replace
      />
    )
  }
  // Two-step applies and they came in with a code alone: set a password first.
  if (admin.setupOnly && location.pathname !== "/account")
    return <Navigate to="/account" replace />
  return children
}
