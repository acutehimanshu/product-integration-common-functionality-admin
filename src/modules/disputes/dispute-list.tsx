import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import {
  PROBLEM_REASON_LABELS,
  type DisputeFilter,
  ESCALATED_LABELS,
} from "@acutehimanshu/core/domain/admin-disputes"
import { CASE_PRIORITY_LABELS } from "@acutehimanshu/core/domain/case-thread"
import { formatMoney } from "@acutehimanshu/core/money"
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
import { disputeKeys, listDisputes, type DisputeListFilter } from "@/modules/disputes/api"

const FILTERS: Array<{ value: DisputeFilter; label: string }> = [
  { value: "escalated", label: "To decide" },
  { value: "overdue", label: "Overdue" },
  { value: "payout_blocked", label: "Holding a payout" },
  { value: "returns", label: "Returns on the way" },
  { value: "resolved", label: "Decided" },
  { value: "all", label: "All" },
]

const ASSIGNEE_FILTERS = [
  { value: "all", label: "Everyone's" },
  { value: "me", label: "Assigned to me" },
]

export function DisputeList() {
  usePageTitle("Disputes")
  const [params] = useSearchParams()
  const filter: DisputeListFilter = {
    status: FILTERS.find((f) => f.value === params.get("status"))?.value ?? "escalated",
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
    assignee: params.get("assignee") === "me" ? "me" : undefined,
  }
  const { data, isPending, error } = useQuery({
    queryKey: disputeKeys.list(filter),
    queryFn: ({ signal }) => listDisputes(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Disputes</Heading>
        <Text variant="muted">
          Problems the buyer and seller couldn&apos;t settle — most urgent, then oldest,
          first.
        </Text>
      </div>
      <FilterTabs param="status" options={FILTERS} label="Filter disputes" />
      <FilterTabs param="assignee" options={ASSIGNEE_FILTERS} label="Whose cases" />
      <SearchBox
        label="Search disputes"
        placeholder="Dispute or order ID, buyer or shop"
      />

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load disputes.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nothing to decide.</Text>
      ) : (
        <>
          <ul className="flex flex-col divide-y rounded-xl border" aria-label="Disputes">
            {data.items.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link to={row.id} className="font-medium hover:underline">
                    {row.reasonLabel ?? PROBLEM_REASON_LABELS[row.reason] ?? row.reason} —
                    order {row.orderId}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {row.buyer.name ?? row.buyer.id} vs {row.seller.shopName} · reported{" "}
                    {timeAgo(row.createdAt)}
                  </span>
                </div>
                {row.priority !== "normal" && (
                  <Badge variant={row.priority === "urgent" ? "destructive" : "outline"}>
                    {CASE_PRIORITY_LABELS[row.priority]}
                  </Badge>
                )}
                {row.assignee && <Badge variant="secondary">{row.assignee}</Badge>}
                <Badge variant="outline">{ESCALATED_LABELS[row.escalatedBecause]}</Badge>
                <span className="w-24 text-right">{formatMoney(row.orderTotal)}</span>
              </li>
            ))}
          </ul>
          <Pager page={data} />
        </>
      )}
    </PageContainer>
  )
}
