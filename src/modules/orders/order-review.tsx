import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { formatMoney } from "@acutehimanshu/core/money"
import { ORDER_FINANCIAL_STATUS_LABELS } from "@acutehimanshu/core/domain/orders"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { OrderStatusBadge } from "@acutehimanshu/ui/components/order-status-badge"
import { OrderTimeline } from "@acutehimanshu/ui/components/order-timeline"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { InternalNotes } from "@/components/internal-notes"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { browserTimeZone, formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { cancelOrder, getOrder, orderKeys } from "@/modules/orders/api"
import { OrderRules } from "@/modules/orders/order-rules"
import { OrderRefunds } from "@/modules/orders/order-refunds"
import { OpenCase } from "@/modules/orders/open-case"

const CANCELLED_BY = {
  buyer: "the buyer",
  seller: "the seller",
  system: "the system",
  admin: "Marketbase",
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  )
}

export function OrderReview() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => getOrder(id, { signal }),
  })
  usePageTitle(`Order ${id}`)

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Orders
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this order.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>
              Order <span className="font-mono">{data.order.id}</span>
            </Heading>
            <OrderStatusBadge
              status={data.order.status}
              fulfilment={data.order.fulfilment}
            />
            {data.late && <Badge variant="destructive">Late</Badge>}
          </div>
          <Text variant="muted">
            Placed {formatDateTime(data.order.createdAt)} · ship by{" "}
            {formatDateTime(data.order.shipBy)}
            {data.gateway && ` · paid through ${data.gateway.name}`}
          </Text>
          {data.order.cancellation && (
            <Text>
              Cancelled by {CANCELLED_BY[data.order.cancellation.by]} on{" "}
              {formatDateTime(data.order.cancellation.at)}: “
              {data.order.cancellation.reason}”
            </Text>
          )}

          {data.cancellable && (
            <div>
              <ReasonDialog
                trigger="Cancel and refund"
                triggerVariant="destructive"
                title="Cancel this order and refund the buyer?"
                description="The buyer gets a full refund, the stock goes back to the listing, and both sides are told. For refunds after delivery, use a dispute."
                reasonHint="The buyer and the seller see this."
                confirmLabel="Cancel and refund"
                destructive
                noteRequired
                onConfirm={async (reason, note = "") => {
                  const updated = await cancelOrder(id, { reason, note })
                  queryClient.setQueryData(orderKeys.detail(id), updated)
                  await queryClient.invalidateQueries({
                    queryKey: [...orderKeys.all, "list"],
                  })
                  await queryClient.invalidateQueries({
                    queryKey: ["admin", "dashboard"],
                  })
                  toast.success("Order cancelled and refunded")
                }}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Items
                </Heading>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <ul className="flex flex-col gap-2">
                  {data.order.items.map((item) => (
                    <li key={item.listingId} className="flex gap-2">
                      <span className="flex-1">
                        {item.quantity} × {item.title}
                      </span>
                      <span>{formatMoney(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="border-t pt-2">
                  <Row label="Delivery">{formatMoney(data.order.shipping)}</Row>
                  <Row label="Total">
                    <strong>{formatMoney(data.order.total)}</strong>
                  </Row>
                  <Row label="Payment">
                    {ORDER_FINANCIAL_STATUS_LABELS[data.order.financialStatus]}
                    {data.order.refunded &&
                      ` — ${formatMoney(data.order.refunded)} back to the buyer`}
                  </Row>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  People
                </Heading>
              </CardHeader>
              <CardContent>
                <dl>
                  <Row label="Buyer">{data.buyer.name ?? data.buyer.id}</Row>
                  <Row label="Contact">{data.buyer.email ?? data.buyer.phone ?? "—"}</Row>
                  <Row label="Seller">{data.order.seller.shopName}</Row>
                  <Row label="Deliver to">
                    {[
                      data.order.deliveryAddress.fullName,
                      data.order.deliveryAddress.line1,
                      data.order.deliveryAddress.city,
                      data.order.deliveryAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Row>
                  {data.order.shipment && (
                    <Row label="Tracking">
                      {data.order.shipment.carrier} ·{" "}
                      <span className="font-mono">
                        {data.order.shipment.trackingNumber}
                      </span>
                    </Row>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>

          <section aria-labelledby="tracking-heading" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="tracking-heading">
              Tracking
            </Heading>
            <OrderTimeline order={data.order} timeZone={browserTimeZone()} />
          </section>

          <OrderRules id={id} rules={data.rules} />
          <OrderRefunds orderId={id} refunds={data.order.refunds ?? []} />
          <div>
            <OpenCase order={data.order} />
          </div>
          <InternalNotes kind="orders" id={id} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
