import { Link, useSearchParams } from "react-router"
import type { Page } from "@acutehimanshu/core/types/page"
import { buttonVariants } from "@acutehimanshu/ui/components/ui/button"

/** Previous / next for a paginated list, kept in ?page=. Hidden for one page. */
export function Pager({ page }: { page: Page<unknown> }) {
  const [params] = useSearchParams()
  const pages = Math.ceil(page.total / page.pageSize)
  if (pages <= 1) return null
  const to = (n: number) => {
    const next = new URLSearchParams(params)
    next.set("page", String(n))
    return `?${next}`
  }
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-2 text-sm">
      {page.page > 1 ? (
        <Link
          to={to(page.page - 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {page.page} of {pages} · {page.total} in total
      </span>
      {page.page < pages ? (
        <Link
          to={to(page.page + 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
