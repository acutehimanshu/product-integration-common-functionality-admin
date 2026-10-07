import { Outlet } from "react-router"
import { AdminHeader } from "@/components/admin-header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { useAdmin } from "@/lib/auth"
import { sidebarFor } from "@/modules"

/** The signed-in workspace: header + the sections this admin may use. */
export function AdminLayout() {
  const { data: admin } = useAdmin()
  if (!admin) return null // <RequireAdmin> redirects first.
  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader admin={admin} />
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminSidebar items={sidebarFor(admin)} />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
