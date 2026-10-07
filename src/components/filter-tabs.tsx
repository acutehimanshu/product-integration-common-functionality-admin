import { Link, useSearchParams } from "react-router"
import { cn } from "@acutehimanshu/ui/utils"

/**
 * A row of filters kept in the URL (?status=…), so a filtered queue can be
 * bookmarked and shared. Changing the filter goes back to page 1.
 */
export function FilterTabs({
  param,
  options,
  label,
}: {
  param: string
  options: Array<{ value: string; label: string }>
  label: string
}) {
  const [params] = useSearchParams()
  const current = params.get(param) ?? options[0]?.value ?? ""
  return (
    <nav aria-label={label}>
      <ul className="-mb-px flex gap-4 overflow-x-auto border-b text-sm">
        {options.map((option) => {
          const next = new URLSearchParams(params)
          next.set(param, option.value)
          next.delete("page")
          const active = option.value === current
          return (
            <li key={option.value} className="shrink-0">
              <Link
                to={`?${next}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 py-2",
                  active
                    ? "border-foreground text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
