import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminOrderDetail } from "@acutehimanshu/core/domain/admin-orders"
import type { RefundRecord } from "@acutehimanshu/core/domain/orders"
import { formatMoney } from "@acutehimanshu/core/money"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { orderKeys } from "@/modules/orders/api"

const LABELS: Record<RefundRecord["status"], string> = {
  processing: "Being sent",
  succeeded: "Refunded",
  failed: "Failed",
}

/** The order's refunds and how each went (FRD-06 PFS-027); failed ones can be retried. */
export function OrderRefunds({
  orderId,
  refunds,
}: Readonly<{ orderId: string; refunds: RefundRecord[] }>) {
  const queryClient = useQueryClient()
  if (refunds.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <Heading as="h2" size="h3">
          Refunds
        </Heading>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm" aria-label="Refunds">
          {refunds.map((refund) => (
            <li key={refund.key} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{formatMoney(refund.amount)}</span>
              <Badge variant={refund.status === "failed" ? "destructive" : "outline"}>
                {LABELS[refund.status]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(refund.createdAt)} · {refund.attempts} attempt
                {refund.attempts === 1 ? "" : "s"}
                {refund.error ? ` · ${refund.error}` : ""}
              </span>
              {refund.status === "failed" && (
                <ReasonDialog
                  trigger="Retry"
                  triggerLabel={`Retry the ${formatMoney(refund.amount)} refund`}
                  title="Send this refund again?"
                  description="It uses the same reference, so the buyer can't be refunded twice."
                  confirmLabel="Retry"
                  onConfirm={async (reason) => {
                    const updated = await api.post<AdminOrderDetail>(
                      `/admin/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refund.key)}/retry`,
                      { reason }
                    )
                    queryClient.setQueryData(orderKeys.detail(orderId), updated)
                    toast.success("Refund sent again")
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
