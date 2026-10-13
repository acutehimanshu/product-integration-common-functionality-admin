import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import {
  CHECKOUT_SESSION_STATUS_LABELS,
  type CheckoutSession,
} from "@acutehimanshu/core/domain/checkout"
import type { PaymentLogEntry } from "@acutehimanshu/core/domain/payments"
import { formatMoney } from "@acutehimanshu/core/money"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

type CheckoutDetail = { session: CheckoutSession; log: PaymentLogEntry[] }

/** One checkout in full (FRD-06 PFS-009/067): its timeline, gateway log and orders. */
export function CheckoutDetailPage() {
  const { id = "" } = useParams()
  usePageTitle(`Checkout ${id}`)
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "checkout-sessions", "detail", id],
    queryFn: ({ signal }) =>
      api.get<CheckoutDetail>(`/admin/checkout-sessions/${encodeURIComponent(id)}`, {
        signal,
      }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/orders/reconcile?status=all" className="text-sm underline">
        All checkouts
      </Link>
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the checkout.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-64" />}
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>Checkout {data.session.id}</Heading>
            <Badge variant="outline">
              {CHECKOUT_SESSION_STATUS_LABELS[data.session.status]}
            </Badge>
          </div>
          <Text variant="muted">
            {formatMoney(data.session.total)} ·{" "}
            {data.session.gateway?.name ?? "No gateway"}
            {data.session.orderIds.length > 0 && " · orders "}
            {data.session.orderIds.map((orderId, i) => (
              <span key={orderId}>
                {i > 0 && ", "}
                <Link to={`/orders/${orderId}`} className="underline">
                  {orderId}
                </Link>
              </span>
            ))}
          </Text>
          <Card>
            <CardHeader>
              <Heading as="h2" size="h3">
                Status history
              </Heading>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-1 text-sm" aria-label="Status history">
                {data.session.events.map((event, i) => (
                  <li key={`${event.at}-${i}`}>
                    <span className="text-muted-foreground">
                      {formatDateTime(event.at)}
                    </span>{" "}
                    {CHECKOUT_SESSION_STATUS_LABELS[event.status]}
                    {event.note && ` — ${event.note}`}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Heading as="h2" size="h3">
                Gateway log
              </Heading>
            </CardHeader>
            <CardContent>
              {data.log.length === 0 ? (
                <Text variant="muted">Nothing from the gateway yet.</Text>
              ) : (
                <ul className="flex flex-col gap-1 text-sm" aria-label="Gateway log">
                  {data.log.map((entry) => (
                    <li key={entry.id}>
                      <span className="text-muted-foreground">
                        {formatDateTime(entry.at)}
                      </span>{" "}
                      {entry.kind} · {entry.gatewayName} · {entry.ok ? "ok" : "failed"}
                      {entry.reference && ` · ${entry.reference}`}
                      {entry.error && ` · ${entry.error}`}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  )
}
