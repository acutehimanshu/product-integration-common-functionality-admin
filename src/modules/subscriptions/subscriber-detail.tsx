import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { formatMoney } from "@acutehimanshu/core/money"
import {
  BILLING_INTERVAL_LABELS,
  CREDIT_ENTRY_LABELS,
  LIMITS,
  PLAN_SIDE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type AdminSubscriberDetail,
  type LimitKey,
} from "@acutehimanshu/core/domain/subscriptions"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
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
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import {
  adjustCredits,
  getSubscriber,
  subscriptionKeys,
} from "@/modules/subscriptions/api"
import { useSide } from "@/modules/subscriptions/section-nav"

export function SubscriberDetail() {
  const { userId = "" } = useParams()
  const side = useSide()
  const { data, isPending, error } = useQuery({
    queryKey: subscriptionKeys.subscriber(side, userId),
    queryFn: ({ signal }) => getSubscriber(side, userId, { signal }),
  })
  usePageTitle(data?.name ?? "Subscriber")

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to={`/subscriptions/subscribers?side=${side}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Subscribers
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this subscriber.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-80" />
      ) : (
        <Detail detail={data} />
      )}
    </PageContainer>
  )
}

function Detail({ detail }: { detail: AdminSubscriberDetail }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState("")
  const { entitlements: e } = detail
  const sub = e.subscription
  const credits = Number(amount)

  return (
    <>
      <div className="flex flex-col gap-1">
        <Heading>{detail.name ?? detail.userId}</Heading>
        <Text variant="muted">
          {PLAN_SIDE_LABELS[detail.side]} · {detail.email ?? detail.userId}
          {!e.enabled && " · Subscriptions are switched off for this side"}
        </Text>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <dt className="text-muted-foreground">Package</dt>
          <dd className="font-medium">
            {e.plan.name}
            {sub &&
              ` · ${BILLING_INTERVAL_LABELS[sub.interval]} ${formatMoney(sub.price)}`}
          </dd>
          {sub && (
            <dd className="text-muted-foreground text-xs">
              {SUBSCRIPTION_STATUS_LABELS[sub.status]} ·{" "}
              {sub.status === "cancelling" ? "ends" : "renews"}{" "}
              {formatDateTime(sub.currentPeriodEnd)}
              {sub.pendingPlan && ` · moving to ${sub.pendingPlan.name}`}
            </dd>
          )}
        </div>
        <div className="rounded-xl border p-4">
          <dt className="text-muted-foreground">Credits</dt>
          <dd className="font-medium">{e.credits.total}</dd>
          <dd className="text-muted-foreground text-xs">
            {e.credits.included} included · {e.credits.purchased} bought or given
          </dd>
        </div>
        <div className="rounded-xl border p-4">
          <dt className="text-muted-foreground">Usage</dt>
          {(
            Object.entries(e.usage) as [
              LimitKey,
              { used: number; limit: number | null },
            ][]
          ).map(([key, usage]) => (
            <dd key={key} className="text-xs">
              {LIMITS[key].label}: {usage.used} of {usage.limit ?? "unlimited"}
            </dd>
          ))}
        </div>
      </dl>

      <section aria-labelledby="adjust-heading" className="flex flex-col gap-2">
        <Heading as="h2" size="h3" id="adjust-heading">
          Add or remove credits
        </Heading>
        <Text variant="muted">
          Added credits never expire. The reason shows in their credit history.
        </Text>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-amount">Credits</Label>
            <Input
              id="adjust-amount"
              type="number"
              min={1}
              className="w-28"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
            />
          </div>
          <ReasonDialog
            trigger="Add credits"
            triggerVariant="default"
            title={`Add ${amount || "…"} credits?`}
            description="They're added straight away and don't expire."
            confirmLabel="Add"
            validate={() =>
              Number.isInteger(credits) && credits > 0
                ? null
                : "Enter a whole number above 0."
            }
            noteRequired
            onConfirm={async (reason, note = "") => {
              queryClient.setQueryData(
                subscriptionKeys.subscriber(detail.side, detail.userId),
                await adjustCredits(detail.side, detail.userId, credits, { reason, note })
              )
              setAmount("")
              toast.success(`${credits} credits added`)
            }}
          />
          <ReasonDialog
            trigger="Remove credits"
            title={`Remove ${amount || "…"} credits?`}
            description="Taken from this month's included credits first, then the rest."
            confirmLabel="Remove"
            destructive
            validate={() =>
              Number.isInteger(credits) && credits > 0
                ? credits <= e.credits.total
                  ? null
                  : `They only have ${e.credits.total} credits.`
                : "Enter a whole number above 0."
            }
            noteRequired
            onConfirm={async (reason, note = "") => {
              queryClient.setQueryData(
                subscriptionKeys.subscriber(detail.side, detail.userId),
                await adjustCredits(detail.side, detail.userId, -credits, {
                  reason,
                  note,
                })
              )
              setAmount("")
              toast.success(`${credits} credits removed`)
            }}
          />
        </div>
      </section>

      <section aria-labelledby="credit-history-heading" className="flex flex-col gap-2">
        <Heading as="h2" size="h3" id="credit-history-heading">
          Credit history
        </Heading>
        {detail.creditHistory.length === 0 ? (
          <Text variant="muted">No credits yet.</Text>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.creditHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(entry.at)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {CREDIT_ENTRY_LABELS[entry.kind]}
                    <span className="text-muted-foreground block text-xs">
                      {entry.note}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.credits > 0 ? `+${entry.credits}` : entry.credits}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <AuditHistory entries={detail.history} />
    </>
  )
}
