import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import type { ListingReviewItem } from "@acutehimanshu/core/domain/restrictions"
import type { Page } from "@acutehimanshu/core/types/page"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { timeAgo } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { ModerationTabs } from "@/modules/listings/moderation-tabs"

const FILTERS = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

const reviewKeys = {
  all: ["admin", "listing-reviews"] as const,
  list: (state: string, page: number) => [...reviewKeys.all, state, page] as const,
}

/**
 * Listings a restriction rule sends for review, one row per country
 * (FRD-04 CAT-027): not shown there until approved.
 */
export function ReviewQueue() {
  usePageTitle("Waiting for review")
  const [params] = useSearchParams()
  const state = FILTERS.find((f) => f.value === params.get("state"))?.value ?? "pending"
  const page = Number(params.get("page")) || 1
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: reviewKeys.list(state, page),
    queryFn: ({ signal }) =>
      api.get<Page<ListingReviewItem>>(
        `/admin/listing-reviews?state=${state}&page=${page}`,
        { signal }
      ),
  })
  const decide =
    (item: ListingReviewItem, decision: "approve" | "reject") =>
    async (reason: string) => {
      await api.post(
        `/admin/listing-reviews/${encodeURIComponent(item.listingId)}/${item.country}`,
        { decision, reason }
      )
      await queryClient.invalidateQueries({ queryKey: reviewKeys.all })
      toast.success(decision === "approve" ? "Approved" : "Rejected")
    }

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Listing moderation</Heading>
        <Text variant="muted">
          Listings a restriction sends for review, per country. Oldest first.
        </Text>
      </div>
      <ModerationTabs />
      <FilterTabs param="state" options={FILTERS} label="Filter reviews" />
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load reviews.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && <Text variant="muted">Nothing here.</Text>}
      {data && data.items.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Reviews">
          {data.items.map((item) => (
            <li
              key={`${item.listingId}-${item.country}-${item.decidedAt ?? ""}`}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {item.title}
                  <Badge variant="outline">{item.country}</Badge>
                </span>
                <span className="text-muted-foreground text-xs">
                  {item.shopName} · {item.categoryName} · {item.ruleNote} ·{" "}
                  {timeAgo(item.decidedAt ?? item.requestedAt)}
                </span>
                {item.reason && <span className="text-xs">“{item.reason}”</span>}
              </div>
              {item.state === "pending" && (
                <div className="flex gap-2">
                  <ReasonDialog
                    trigger="Approve"
                    triggerLabel={`Approve ${item.title} for ${item.country}`}
                    title={`Show “${item.title}” in ${item.country}?`}
                    description="It goes on sale there. A change to the listing or the rule asks again."
                    confirmLabel="Approve"
                    onConfirm={decide(item, "approve")}
                  />
                  <ReasonDialog
                    trigger="Reject"
                    triggerVariant="outline"
                    triggerLabel={`Reject ${item.title} for ${item.country}`}
                    title={`Keep “${item.title}” off sale in ${item.country}?`}
                    description="The seller sees your reason."
                    confirmLabel="Reject"
                    onConfirm={decide(item, "reject")}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data} />}
    </PageContainer>
  )
}
