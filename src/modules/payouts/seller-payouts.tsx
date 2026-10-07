import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import type { AdminPayoutDetail } from "@acutehimanshu/core/domain/admin-payouts"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { OrderStatusBadge } from "@acutehimanshu/ui/components/order-status-badge"
import { StatCard } from "@acutehimanshu/ui/components/stat-card"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acutehimanshu/ui/components/ui/table"
import { AuditHistory } from "@/components/audit-history"
import { InternalNotes } from "@/components/internal-notes"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import {
  getPayouts,
  holdPayouts,
  payoutKeys,
  releasePayouts,
} from "@/modules/payouts/api"

const LINE_STATUS = { pending: "Pending", paid: "Paid", cancelled: "Not paid" }

export function SellerPayouts() {
  const { sellerId = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: payoutKeys.detail(sellerId),
    queryFn: ({ signal }) => getPayouts(sellerId, { signal }),
  })
  usePageTitle(data ? `${data.shopName} payouts` : "Payouts")

  const saved = async (updated: AdminPayoutDetail, message: string) => {
    queryClient.setQueryData(payoutKeys.detail(sellerId), updated)
    await queryClient.invalidateQueries({ queryKey: [...payoutKeys.all, "list"] })
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
    toast.success(message)
  }

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Payouts
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this seller's payouts.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{data.shopName}</Heading>
            {data.hold ? (
              <Badge variant="destructive">On hold</Badge>
            ) : data.payoutsEnabled ? (
              <Badge variant="outline">Payouts on</Badge>
            ) : (
              <Badge variant="outline">Not verified</Badge>
            )}
          </div>
          {data.hold && (
            <Text variant="muted">
              On hold since {formatDateTime(data.hold.at)}: “{data.hold.reason}”
            </Text>
          )}

          <div>
            {data.hold ? (
              <ReasonDialog
                trigger="Release payouts"
                title={`Release ${data.shopName}'s payouts?`}
                description="Pending payouts go out on the payment partner's next run."
                confirmLabel="Release"
                noteRequired
                onConfirm={async (reason, note = "") =>
                  saved(
                    await releasePayouts(sellerId, { reason, note }),
                    "Payouts released"
                  )
                }
              />
            ) : (
              <ReasonDialog
                trigger="Hold payouts"
                triggerVariant="destructive"
                title={`Hold ${data.shopName}'s payouts?`}
                description="Nothing is paid out until you release it. Orders and listings carry on as normal."
                reasonHint="The seller sees this on their payouts page."
                confirmLabel="Hold payouts"
                destructive
                noteRequired
                onConfirm={async (reason, note = "") =>
                  saved(await holdPayouts(sellerId, { reason, note }), "Payouts on hold")
                }
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Owed" value={formatMoney(data.pending)} />
            <StatCard label="Paid out" value={formatMoney(data.paidOut)} />
            <StatCard label="Platform fees" value={formatMoney(data.fees)} />
            <StatCard
              label="Open disputes"
              value={data.openDisputes}
              highlight={data.openDisputes > 0}
            />
          </div>

          <section aria-labelledby="lines-heading" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="lines-heading">
              Orders
            </Heading>
            {data.lines.length === 0 ? (
              <Text variant="muted">No orders yet.</Text>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sale</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lines.map((line) => (
                    <TableRow key={line.orderId}>
                      <TableCell>
                        <span className="font-mono">{line.orderId}</span>
                        <span className="text-muted-foreground block text-xs">
                          {formatDateTime(line.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={line.orderStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(line.sale)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(line.payout)}
                        <span className="text-muted-foreground block text-xs">
                          {LINE_STATUS[line.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <InternalNotes kind="payouts" id={sellerId} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
