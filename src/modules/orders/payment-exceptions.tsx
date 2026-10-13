import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
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
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { ORDER_TABS } from "@/modules/orders/reconcile-queue"

type PaymentException = {
  id: string
  at: string
  gatewayId: string
  eventType: string
  reference: string
  outcome: string | null
  problem: string
  state: "open" | "resolved" | "dismissed"
  resolvedBy?: string
}

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "all", label: "All" },
]

const keys = { all: ["admin", "payment-exceptions"] as const }

/** Gateway events we couldn't process (FRD-06 PFS-014): reprocess or dismiss. */
export function PaymentExceptions() {
  usePageTitle("Payment exceptions")
  const [params] = useSearchParams()
  const state = FILTERS.find((f) => f.value === params.get("state"))?.value ?? "open"
  const page = Number(params.get("page")) || 1
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: [...keys.all, state, page],
    queryFn: ({ signal }) =>
      api.get<Page<PaymentException>>(
        `/admin/payment-exceptions?state=${state}&page=${page}`,
        { signal }
      ),
  })
  const act =
    (item: PaymentException, action: "retry" | "dismiss") => async (reason: string) => {
      await api.post(`/admin/payment-exceptions/${item.id}/${action}`, { reason })
      await queryClient.invalidateQueries({ queryKey: keys.all })
      toast.success(action === "retry" ? "Reprocessed" : "Dismissed")
    }
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Orders</Heading>
        <Text variant="muted">
          Gateway events that didn&apos;t match a checkout or failed to process.
        </Text>
      </div>
      <SubNav tabs={ORDER_TABS} label="Orders" />
      <FilterTabs param="state" options={FILTERS} label="Filter exceptions" />
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load exceptions.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && <Text variant="muted">Nothing here.</Text>}
      {data && data.items.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Exceptions">
          {data.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {item.eventType} · {item.reference}
                  <Badge variant="outline">{item.state}</Badge>
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(item.at)} · {item.problem}
                  {item.resolvedBy ? ` · by ${item.resolvedBy}` : ""}
                </span>
              </div>
              {item.state === "open" && (
                <div className="flex gap-2">
                  <ReasonDialog
                    trigger="Reprocess"
                    triggerLabel={`Reprocess ${item.id}`}
                    title="Process this event again?"
                    description="Useful once the checkout it belongs to exists."
                    confirmLabel="Reprocess"
                    onConfirm={act(item, "retry")}
                  />
                  <ReasonDialog
                    trigger="Dismiss"
                    triggerVariant="outline"
                    triggerLabel={`Dismiss ${item.id}`}
                    title="Dismiss this event?"
                    description="It stays in the list as dismissed."
                    confirmLabel="Dismiss"
                    onConfirm={act(item, "dismiss")}
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
