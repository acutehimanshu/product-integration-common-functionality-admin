import { NavLink, useSearchParams } from "react-router"
import type { PlanSide } from "@acutehimanshu/core/domain/subscriptions"
import { cn } from "@acutehimanshu/ui/utils"

const SECTIONS = [
  { to: "/subscriptions", label: "Overview", end: true },
  { to: "/subscriptions/packages", label: "Packages" },
  { to: "/subscriptions/packs", label: "Credit packs" },
  { to: "/subscriptions/subscribers", label: "Subscribers" },
]

/** The module's own tabs; the buyer/seller choice carries across. */
export function SectionNav() {
  const [params] = useSearchParams()
  const side = params.get("side")
  return (
    <nav aria-label="Subscriptions sections">
      <ul className="-mb-px flex gap-4 overflow-x-auto border-b text-sm">
        {SECTIONS.map((section) => (
          <li key={section.to} className="shrink-0">
            <NavLink
              to={side && !section.end ? `${section.to}?side=${side}` : section.to}
              end={section.end}
              className={({ isActive }) =>
                cn(
                  "inline-block border-b-2 py-2",
                  isActive
                    ? "border-foreground text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )
              }
            >
              {section.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export const SIDE_OPTIONS: Array<{ value: PlanSide; label: string }> = [
  { value: "seller", label: "Sellers" },
  { value: "buyer", label: "Buyers" },
]

/** ?side= (sellers by default). */
export function useSide(): PlanSide {
  const [params] = useSearchParams()
  return params.get("side") === "buyer" ? "buyer" : "seller"
}
