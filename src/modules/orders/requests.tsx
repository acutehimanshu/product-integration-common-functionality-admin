import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"
import type { Page } from "@acutehimanshu/core/types/page"
import {
  QUOTE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  type AdminRequestDetail,
  type AdminRequestRow,
} from "@acutehimanshu/core/domain/rfq"
import { formatMoney } from "@acutehimanshu/core/money"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { ReasonDialog } from "@/components/reason-dialog"
import { SearchBox } from "@/components/search-box"
import { SubNav } from "@/components/sub-nav"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { ORDER_TABS } from "@/modules/orders/reconcile-queue"

const keys = { all: ["admin", "requests"] as const }

const FILTERS = [
  { value: "", label: "All" },
  { value: "in_review", label: "To review" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
]

/** Admin › Orders › Requests (FRD-08 RFQ-035): every buyer request, searchable. */
export function RequestList() {
  usePageTitle("Buyer requests")
  const [params] = useSearchParams()
  const query = new URLSearchParams({
    status: params.get("status") ?? "",
    q: params.get("q") ?? "",
    page: params.get("page") ?? "1",
  }).toString()
  const { data, isPending, error } = useQuery({
    queryKey: [...keys.all, "list", query],
    queryFn: ({ signal }) =>
      api.get<Page<AdminRequestRow>>(`/admin/requests?${query}`, { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Heading>Orders</Heading>
      <SubNav tabs={ORDER_TABS} label="Orders" />
      <FilterTabs param="status" options={FILTERS} label="Filter requests" />
      <SearchBox label="Search requests" placeholder="Request ID, title or buyer" />
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load requests.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-40" />}
      {data?.items.length === 0 && <Text variant="muted">No requests match.</Text>}
      {data && data.items.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Requests"
        >
          {data.items.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link to={row.id} className="font-medium hover:underline">
                  {row.title}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {row.categoryName} · {row.buyerName ?? row.buyerId} · {row.quoteCount}{" "}
                  quote(s) · {formatDateTime(row.createdAt)}
                </span>
              </div>
              <Badge variant="outline">{REQUEST_STATUS_LABELS[row.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data} />}
    </PageContainer>
  )
}

/** One request with every quote (drafts too), versions, questions and history. */
export function RequestDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: [...keys.all, "detail", id],
    queryFn: ({ signal }) =>
      api.get<AdminRequestDetail>(`/admin/requests/${id}`, { signal }),
  })
  usePageTitle(data?.request.title ?? "Request")
  if (error)
    return (
      <PageContainer maxWidth="4xl">
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this request.")}
        </Text>
      </PageContainer>
    )
  if (isPending) return <Skeleton className="h-64" />
  const { request } = data
  const moderate = async (outcome: "approved" | "rejected", reason: string) => {
    await api.post(`/admin/requests/${id}/moderate`, { outcome, reason })
    await queryClient.invalidateQueries({ queryKey: keys.all })
    toast.success(outcome === "approved" ? "Request approved" : "Request refused")
  }
  return (
    <PageContainer maxWidth="4xl">
      <Link
        to="/orders/requests"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Requests
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Heading>{request.title}</Heading>
        <Badge variant="outline">{REQUEST_STATUS_LABELS[request.status]}</Badge>
      </div>
      <Text variant="muted">
        {data.categoryName} · {data.buyer.name ?? data.buyer.id} · version{" "}
        {request.version ?? 1}
        {(request.quantity ?? 1) > 1 && ` · ${request.quantity} ${request.unit ?? ""}`} ·
        to {request.targetCountry} · {request.visibility ?? "all"} sellers
      </Text>
      {request.status === "in_review" && (
        <div className="flex gap-2">
          <ReasonDialog
            trigger="Approve"
            title="Approve this request?"
            description="Eligible sellers can see it and quote."
            confirmLabel="Approve"
            onConfirm={(reason) => moderate("approved", reason)}
          />
          <ReasonDialog
            trigger="Refuse"
            title="Refuse this request?"
            description="The buyer is told it isn't allowed."
            confirmLabel="Refuse"
            destructive
            onConfirm={(reason) => moderate("rejected", reason)}
          />
        </div>
      )}
      {(request.questions ?? []).length > 0 && (
        <section className="flex flex-col gap-1 text-sm">
          <Heading as="h2" size="h3">
            Questions
          </Heading>
          {(request.questions ?? []).map((q) => (
            <p key={q.id}>
              “{q.question}” — {q.answer ?? "not answered"}
            </p>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-2 text-sm">
        <Heading as="h2" size="h3">
          Quotes ({data.quotes.length})
        </Heading>
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Quotes">
          {data.quotes.map((quote) => (
            <li key={quote.id} className="flex flex-col gap-0.5 p-3">
              <span className="font-medium">
                {quote.shopName} · {formatMoney(quote.price)} ·{" "}
                {QUOTE_STATUS_LABELS[quote.status]}
              </span>
              <span className="text-muted-foreground text-xs">
                {quote.listing.title} · version {quote.version ?? 1}
                {(quote.versions ?? []).length > 1 &&
                  ` (was ${(quote.versions ?? []).map((v) => formatMoney(v.price)).join(" → ")})`}
                {quote.negotiation &&
                  ` · haggle ${quote.negotiation.status}: ${quote.negotiation.rounds
                    .map((r) => `${r.by} ${formatMoney(r.price)}`)
                    .join(", ")}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <AuditHistory entries={data.history} />
    </PageContainer>
  )
}
