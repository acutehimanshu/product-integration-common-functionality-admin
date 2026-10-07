import { fallbackOn } from "@acutehimanshu/ui/report-error"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import type { AdminMe } from "@acutehimanshu/core/domain/admin"
import { accessSummary } from "@/components/module-access"
import { ThemeToggle } from "@acutehimanshu/ui/components/theme-toggle"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { adminKeys, logOut } from "@/lib/auth"

/** Top bar: brand, who's logged in (and their access), theme, log out. */
export function AdminHeader({ admin }: { admin?: AdminMe }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const onLogOut = async () => {
    setIsLoggingOut(true)
    // Logging out locally must work even if the backend call fails.
    await logOut().catch(fallbackOn("admin logout", undefined))
    queryClient.clear()
    queryClient.setQueryData(adminKeys.me(), null)
    void navigate("/login", { replace: true })
  }

  return (
    <header className="border-border border-b">
      <div className="flex w-full items-center gap-3 px-6 py-3">
        <Link
          to="/"
          className="font-heading flex items-center gap-1.5 text-base font-semibold tracking-tight"
        >
          <img
            src="/logo.svg"
            alt=""
            width={22}
            height={22}
            className="hidden sm:inline-block"
          />
          Marketbase
          <Badge variant="secondary">Admin</Badge>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {admin && (
            <div className="hidden flex-col items-end text-right sm:flex">
              <Link to="/account" className="text-sm font-medium hover:underline">
                {admin.name}
              </Link>
              <span className="text-muted-foreground text-xs">
                {accessSummary(admin)}
              </span>
            </div>
          )}
          <ThemeToggle />
          {admin && (
            <Button
              variant="outline"
              size="sm"
              disabled={isLoggingOut}
              onClick={onLogOut}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
