import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import type { Page } from "@acutehimanshu/core/types/page"
import {
  REVIEW_REPORT_REASON_LABELS,
  type AdminReviewRow,
  type ReviewFilter,
} from "@acutehimanshu/core/domain/admin-reviews"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { ReasonDialog } from "@/components/reason-dialog"
import { SearchBox } from "@/components/search-box"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { reviewKeys } from "@/modules/reviews/keys"
import { ReviewExtras } from "@/modules/reviews/review-extras"
import { RatingHubSync } from "@/modules/reviews/ratinghub-sync"

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "reported", label: "Reported" },
  { value: "pending", label: "Waiting" },
  { value: "hidden", label: "Hidden" },
  { value: "all", label: "All" },
]

/** Reviews moderation: reported ones first; hide or restore with a reason. */
export default function ReviewsPage() {
  usePageTitle("Reviews")
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const filter = {
    status: FILTERS.find((f) => f.value === params.get("status"))?.value ?? "reported",
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
  }
  const { data, isPending, error } = useQuery({
    queryKey: reviewKeys.list(filter),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({
        status: filter.status,
        page: String(filter.page),
      })
      if (filter.q) search.set("q", filter.q)
      return api.get<Page<AdminReviewRow>>(`/admin/reviews?${search}`, { signal })
    },
  })

  const act = async (row: AdminReviewRow, action: "hide" | "restore", reason: string) => {
    await api.post<AdminReviewRow>(
      `/admin/reviews/${encodeURIComponent(row.id)}/${action}`,
      { reason }
    )
    await queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    toast.success(action === "hide" ? "Review hidden" : "Review restored")
  }

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Reviews</Heading>
        <Text variant="muted">
          Buyers&apos; ratings of sellers. Hiding one takes it off the seller&apos;s page
          and out of their rating; nothing is deleted.
        </Text>
      </div>
      <FilterTabs param="status" options={FILTERS} label="Filter reviews" />
      <SearchBox
        label="Search reviews"
        placeholder="Words in the review, buyer or shop"
      />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load reviews.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">
          {filter.status === "reported"
            ? "Nothing reported right now."
            : "No reviews match."}
        </Text>
      ) : (
        <>
          <ul aria-label="Reviews" className="flex flex-col gap-3">
            {data.items.map((row) => (
              <li
                key={row.id}
                aria-label={`${row.buyerName}'s review of ${row.shopName}`}
                className="flex flex-col gap-2 rounded-xl border p-4 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span role="img" aria-label={`${row.stars} out of 5 stars`}>
                    <span aria-hidden="true">{"★".repeat(row.stars)}</span>
                  </span>
                  <span className="flex-1 font-medium">
                    {row.buyerName} → {row.shopName}
                  </span>
                  {row.hidden && <Badge variant="destructive">Hidden</Badge>}
                  {row.reports.length > 0 && (
                    <Badge variant="outline">
                      {row.reports.length} report{row.reports.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(row.createdAt)}
                  </span>
                </div>
                {row.comment ? (
                  <p>“{row.comment}”</p>
                ) : (
                  <p className="text-muted-foreground">No comment.</p>
                )}
                <ReviewExtras row={row} />
                {row.reports.length > 0 && (
                  <ul
                    aria-label="Reports"
                    className="text-muted-foreground flex flex-col gap-0.5"
                  >
                    {row.reports.map((report, index) => (
                      <li key={index}>
                        {REVIEW_REPORT_REASON_LABELS[report.reason]}
                        {report.note && ` — “${report.note}”`}
                      </li>
                    ))}
                  </ul>
                )}
                {row.hidden && (
                  <p className="text-muted-foreground">Hidden: {row.hidden.reason}</p>
                )}
                <div>
                  {row.hidden ? (
                    <ReasonDialog
                      trigger="Restore"
                      title="Restore this review?"
                      description="It goes back on the seller's page and counts in their rating again."
                      confirmLabel="Restore"
                      onConfirm={(reason) => act(row, "restore", reason)}
                    />
                  ) : (
                    <ReasonDialog
                      trigger="Hide"
                      title="Hide this review?"
                      description="It leaves the seller's page and their rating. You can restore it later."
                      confirmLabel="Hide review"
                      destructive
                      onConfirm={(reason) => act(row, "hide", reason)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pager page={data} />
        </>
      )}
      <RatingHubSync />
    </PageContainer>
  )
}
