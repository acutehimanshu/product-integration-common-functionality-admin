import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import {
  MODERATION_ACTION_LABELS,
  REPORT_REASON_LABELS,
} from "@acutehimanshu/core/domain/admin-moderation"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { SearchBox } from "@/components/search-box"
import { getErrorMessage } from "@/lib/api"
import { timeAgo } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import {
  listReported,
  moderationKeys,
  type ModerationFilter,
} from "@/modules/listings/api"
import { CsvButton, exportQuery } from "@/components/csv-button"
import { ModerationTabs } from "@/modules/listings/moderation-tabs"

const FILTERS: Array<{ value: ModerationFilter["state"]; label: string }> = [
  { value: "open", label: "To review" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
]

export function ModerationQueue() {
  usePageTitle("Listing moderation")
  const [params] = useSearchParams()
  const state = FILTERS.find((f) => f.value === params.get("state"))?.value ?? "open"
  const filter: ModerationFilter = {
    state,
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
  }
  const { data, isPending, error } = useQuery({
    queryKey: moderationKeys.list(filter),
    queryFn: ({ signal }) => listReported(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Listing moderation</Heading>
        <div>
          <CsvButton
            path={`/admin/moderation/listings/export?${exportQuery(params)}`}
            filename="marketbase-moderation-listings.csv"
          />
        </div>
        <Text variant="muted">
          Listings reported by buyers or flagged by rules — most-reported first.
        </Text>
      </div>
      <ModerationTabs />
      <FilterTabs param="state" options={FILTERS} label="Filter reports" />
      <SearchBox
        label="Search reported listings"
        placeholder="Title, shop or listing ID"
      />

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load reported listings.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nothing in this list.</Text>
      ) : (
        <>
          <ul
            className="flex flex-col divide-y rounded-xl border"
            aria-label="Reported listings"
          >
            {data.items.map((item) => {
              const reasons = [
                ...new Set(item.reports.map((r) => REPORT_REASON_LABELS[r.reason])),
              ]
              return (
                <li key={item.listingId} className="flex items-center gap-3 p-3">
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt=""
                      className="bg-muted size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="bg-muted size-14 shrink-0 rounded-md" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      to={item.listingId}
                      className="truncate font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      {item.shopName} · first reported {timeAgo(item.firstReportedAt)}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {reasons.map((reason) => (
                        <Badge key={reason} variant="outline">
                          {reason}
                        </Badge>
                      ))}
                      {item.reports.some((r) => r.source === "rule") && (
                        <Badge variant="secondary">Rule</Badge>
                      )}
                      {item.reports.some((r) => r.source === "category") && (
                        <Badge variant="secondary">Check</Badge>
                      )}
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-right text-sm">
                    {item.reports.length}{" "}
                    {item.reports.length === 1 ? "report" : "reports"}
                    {item.outcome && (
                      <span className="block text-xs">
                        {MODERATION_ACTION_LABELS[item.outcome]}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          <Pager page={data} />
        </>
      )}
    </PageContainer>
  )
}
