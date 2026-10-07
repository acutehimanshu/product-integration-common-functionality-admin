import { NavLink } from "react-router"
import type { ModuleNavItem } from "@acutehimanshu/core/modules"
import { cn } from "@acutehimanshu/ui/utils"

/**
 * The admin's sections — only modules that are on AND that this admin's
 * roles allow (sidebarFor). A column on wide screens, a sideways-scrolling
 * row on phones.
 */
export function AdminSidebar({ items }: { items: ModuleNavItem[] }) {
  return (
    <nav
      aria-label="Admin sections"
      className="border-border border-b md:border-r md:border-b-0"
    >
      <ul className="flex gap-1 overflow-x-auto px-4 py-2 text-sm md:w-56 md:flex-col md:px-3 md:py-4">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLink
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "block rounded-md px-3 py-2",
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
