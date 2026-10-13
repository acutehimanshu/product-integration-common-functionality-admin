import { NavLink } from "react-router"
import { cn } from "@acutehimanshu/ui/utils"

export type SubNavTab = { to: string; label: string; end?: boolean }

/** A module's own screens as a tab row (each tab is a route). */
export function SubNav({ tabs, label }: Readonly<{ tabs: SubNavTab[]; label: string }>) {
  return (
    <nav aria-label={label}>
      <ul className="-mb-px flex gap-4 overflow-x-auto border-b text-sm">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "inline-block border-b-2 px-1 py-2",
                  isActive
                    ? "border-foreground font-medium"
                    : "text-muted-foreground border-transparent"
                )
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
