import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"
import {
  CHECKOUT_SESSION_STATUS_LABELS,
  type CheckoutSession,
} from "@acutehimanshu/core/domain/checkout"
import type { Page } from "@acutehimanshu/core/types/page"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { ReasonDialog } from "@/components/reason-dialog"
import { SubNav } from "@/components/sub-nav"
import { api, getErrorMessage } from "@/lib/api"
import { formatMoney } from "@acutehimanshu/core/money"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

export const ORDER_TABS = [
  { to: "/orders", label: "Orders", end: true },
  { to: "/orders/reconcile", label: "Checkouts" },
  { to: "/orders/payment-exceptions", label: "Payment exceptions" },
  { to: "/orders/shipments", label: "Shipping" },
  { to: "/orders/offers", label: "Offers" },
  { to: "/orders/requests", label: "Requests" },
]

const FILTERS = [
  { value: "needs_reconciliation", label: "To reconcile" },
  { value: "all", label: "All checkouts" },
]

const keys = { all: ["admin", "checkout-sessions"] as const }

/**
 * Checkouts whose payment went through but whose orders weren't placed
 * (FRD-05 ORD-067): retry placing them, or refund the buyer.
 */
export function ReconcileQueue() {
  usePageTitle("Payments to reconcile")
  const [params] = useSearchParams()
  const status =
    FILTERS.find((f) => f.value === params.get("status"))?.value ?? FILTERS[0]!.value
  const page = Number(params.get("page")) || 1
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: [...keys.all, status, page],
    queryFn: ({ signal }) =>
      api.get<Page<CheckoutSession>>(
        `/admin/checkout-sessions?status=${status}&page=${page}`,
        { signal }
      ),
  })
  const act =
    (session: CheckoutSession, action: "retry" | "refund") =>
    async (reason: string, note: string | undefined) => {
      const result = await api.post<CheckoutSession>(
        `/admin/checkout-sessions/${encodeURIComponent(session.id)}/${action}`,
        { reason, note }
      )
      await queryClient.invalidateQueries({ queryKey: keys.all })
      toast.success(CHECKOUT_SESSION_STATUS_LABELS[result.status])
    }

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Orders</Heading>
        <Text variant="muted">
          Payments taken whose orders couldn&apos;t be placed. Nobody is charged twice.
        </Text>
      </div>
      <SubNav tabs={ORDER_TABS} label="Orders" />
      <FilterTabs param="status" options={FILTERS} label="Filter checkouts" />
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load checkouts.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && (
        <Text variant="muted">Nothing to reconcile.</Text>
      )}
      {data && data.items.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Checkouts">
          {data.items.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  <Link to={`/orders/checkouts/${session.id}`} className="underline">
                    {session.id}
                  </Link>{" "}
                  · {formatMoney(session.total)}
                  <Badge variant="outline">
                    {CHECKOUT_SESSION_STATUS_LABELS[session.status]}
                  </Badge>
                </span>
                <span className="text-muted-foreground text-xs">
                  {session.gateway?.name ?? "No gateway"} ·{" "}
                  {formatDateTime(session.updatedAt)}
                  {session.events.at(-1)?.note ? ` · ${session.events.at(-1)?.note}` : ""}
                </span>
              </div>
              {session.status === "needs_reconciliation" && (
                <div className="flex gap-2">
                  <ReasonDialog
                    trigger="Retry"
                    triggerLabel={`Retry ${session.id}`}
                    title="Place the orders again?"
                    description="Uses the payment already taken; the buyer isn't charged again."
                    confirmLabel="Retry"
                    onConfirm={act(session, "retry")}
                  />
                  <ReasonDialog
                    trigger="Refund"
                    triggerVariant="outline"
                    triggerLabel={`Refund ${session.id}`}
                    title="Refund the whole payment?"
                    description="The buyer gets everything back through the gateway; no orders are placed."
                    confirmLabel="Refund"
                    noteRequired
                    onConfirm={act(session, "refund")}
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
