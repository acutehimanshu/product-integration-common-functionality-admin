import {
  RESOLUTION_LABELS,
  RETURN_OUTCOME_LABELS,
  SELLER_REJECTION_LABELS,
} from "@acutehimanshu/core/domain/return-policy"
import type { ProblemReport } from "@acutehimanshu/core/domain/returns"
import { useId, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import {
  DISPUTE_OUTCOME_LABELS,
  PROBLEM_REASON_LABELS,
  type DisputeDetail,
  type DisputeOutcome,
  ESCALATED_LABELS,
  DISPUTE_REASON_CODES,
  DISPUTE_REASON_LABELS,
  type DisputeReasonCode,
} from "@acutehimanshu/core/domain/admin-disputes"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { PendingDecision } from "@/modules/disputes/pending-decision"
import {
  NOTE_MIN_LENGTH,
  noteProblem,
  REASON_MIN_LENGTH,
} from "@acutehimanshu/core/domain/admin-audit"
import { formatMoney, toMinorUnits } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { AuditHistory } from "@/components/audit-history"
import { getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { InternalNotes } from "@/components/internal-notes"
import { CaseHandling } from "@/modules/disputes/case-handling"
import { useCanAct } from "@/components/module-access"
import { ReasonDialog } from "@/components/reason-dialog"
import {
  closeReturn,
  decideDispute,
  disputeKeys,
  getDispute,
} from "@/modules/disputes/api"

const OUTCOMES: DisputeOutcome[] = [
  "full_refund",
  "partial_refund",
  "return_and_refund",
  "no_refund",
]

const WHAT_HAPPENS: Record<DisputeOutcome, string> = {
  full_refund: "The buyer gets the whole order back; the seller isn't paid for it.",
  partial_refund: "The buyer gets part back; it comes out of the seller's payout.",
  return_and_refund:
    "The buyer returns it on a label the seller pays for, then gets a full refund.",
  no_refund: "Nothing changes; the seller is paid as normal.",
}

function DecisionForm({
  detail,
  onDecided,
}: {
  detail: DisputeDetail
  onDecided: () => void
}) {
  const id = useId()
  const canAct = useCanAct()
  const [outcome, setOutcome] = useState<DisputeOutcome | null>(null)
  const [refund, setRefund] = useState("")
  const [reason, setReason] = useState("")
  const [reasonCode, setReasonCode] = useState<DisputeReasonCode | "">("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const currency = detail.order.total.currency

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!outcome) return setError("Choose a decision.")
    const amount = Number(refund)
    if (outcome === "partial_refund" && !(amount > 0))
      return setError("Enter the refund amount.")
    if (!reasonCode) return setError("Choose the reason code.")
    if (reason.trim().length < REASON_MIN_LENGTH)
      return setError("Explain the decision — both sides see it.")
    const noteError = noteProblem(note)
    if (noteError) return setError(noteError)
    setIsPending(true)
    try {
      await decideDispute(detail.problem.id, {
        outcome,
        refund:
          outcome === "partial_refund"
            ? { amount: toMinorUnits(amount, currency), currency }
            : undefined,
        reasonCode,
        reason: reason.trim(),
        note: note.trim(),
      })
      toast.success(DISPUTE_OUTCOME_LABELS[outcome])
      onDecided()
    } catch (err) {
      setError(getErrorMessage(err, "That didn't work. Try again."))
    } finally {
      setIsPending(false)
    }
  }

  // View only: the decision isn't theirs to make (the backend refuses it too).
  if (!canAct || detail.problem.pendingDecision) return null
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
      aria-label="Decision"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Decision</legend>
        {OUTCOMES.map((option) => (
          <label key={option} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name={`${id}-outcome`}
              value={option}
              checked={outcome === option}
              onChange={() => {
                setOutcome(option)
                setError(null)
              }}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{DISPUTE_OUTCOME_LABELS[option]}</span>
              <span className="text-muted-foreground block text-xs">
                {WHAT_HAPPENS[option]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {outcome === "partial_refund" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-refund`}>Refund ({currency})</Label>
          <Input
            id={`${id}-refund`}
            type="number"
            min={1}
            step="0.01"
            className="max-w-40"
            value={refund}
            onChange={(event) => setRefund(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Less than the order total of {formatMoney(detail.order.total)}.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-code`}>Reason code</Label>
        <NativeSelect
          id={`${id}-code`}
          value={reasonCode}
          onChange={(event) => setReasonCode(event.target.value as DisputeReasonCode)}
        >
          <option value="">Choose…</option>
          {DISPUTE_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {DISPUTE_REASON_LABELS[code]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-reason`}>Explain the decision</Label>
        <Textarea
          id={`${id}-reason`}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setError(null)
          }}
        />
        <p className="text-muted-foreground text-xs">
          The buyer and the seller see this.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-note`}>Internal note</Label>
        <Textarea
          id={`${id}-note`}
          value={note}
          aria-describedby={`${id}-note-hint`}
          onChange={(event) => {
            setNote(event.target.value)
            setError(null)
          }}
        />
        <p id={`${id}-note-hint`} className="text-muted-foreground text-xs">
          The full story for the team (at least {NOTE_MIN_LENGTH} characters). Only admins
          see this.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Decide"}
      </Button>
    </form>
  )
}

/** The return policy the case was opened under (FRD-07 ELG-003, ADM-074). */
function PolicySnapshot({ problem }: Readonly<{ problem: ProblemReport }>) {
  const policy = problem.policy
  if (!policy) return null
  return (
    <section aria-labelledby="policy-heading" className="flex flex-col gap-1 text-sm">
      <Heading as="h2" size="h3" id="policy-heading">
        Return policy
      </Heading>
      <p>
        {policy.ruleName} · {RETURN_OUTCOME_LABELS[policy.outcome]} · allows{" "}
        {policy.resolutions.map((r) => RESOLUTION_LABELS[r].toLowerCase()).join(", ") ||
          "nothing"}
        {policy.maxRefundWithoutReturn !== null &&
          ` · refund without return up to ${(policy.maxRefundWithoutReturn / 100).toFixed(2)}`}
      </p>
      {problem.refundStatus && <p>Refund: {problem.refundStatus}</p>}
      {problem.returnAuthorization && (
        <p>
          Return {problem.returnAuthorization.reference}
          {problem.returnAuthorization.shipment
            ? ` · sent with ${problem.returnAuthorization.shipment.carrier} (${problem.returnAuthorization.shipment.trackingNumber}, ${problem.returnAuthorization.shipment.source})`
            : " · not sent yet"}
        </p>
      )}
      {problem.override && (
        <p className="text-muted-foreground">
          Opened outside the policy by {problem.override.by}: {problem.override.reason}
        </p>
      )}
    </section>
  )
}

export function DisputeReview() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: disputeKeys.detail(id),
    queryFn: ({ signal }) => getDispute(id, { signal }),
  })
  usePageTitle(`Dispute ${id}`)

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Disputes
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this dispute.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>
              {data.problem.reasonLabel ??
                PROBLEM_REASON_LABELS[data.problem.reason] ??
                data.problem.reason}{" "}
              — order {data.order.id}
            </Heading>
            <Badge variant="outline">{ESCALATED_LABELS[data.escalatedBecause]}</Badge>
          </div>
          <Text variant="muted">
            {data.buyer.name ?? data.buyer.id} vs {data.order.seller.shopName} · reported{" "}
            {formatDateTime(data.problem.createdAt)} · order total{" "}
            {formatMoney(data.order.total)}
          </Text>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Buyer says
                </Heading>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p>“{data.problem.details}”</p>
                {data.problem.photos.length > 0 && (
                  <ul aria-label="Buyer's photos" className="flex flex-wrap gap-2">
                    {data.problem.photos.map((url, index) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={`Photo ${index + 1} (opens full size)`}
                            className="size-20 rounded-md border object-cover"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-muted-foreground">
                  Wants:{" "}
                  {data.problem.wants === "refund"
                    ? "a refund"
                    : "to return it for a refund"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Seller says
                </Heading>
              </CardHeader>
              <CardContent className="text-sm">
                {data.problem.sellerResponse ? (
                  <p>
                    {data.problem.sellerResponse.decision === "reject"
                      ? "Rejected"
                      : "Accepted"}
                    {data.problem.sellerResponse.rejectionReason &&
                      ` (${SELLER_REJECTION_LABELS[data.problem.sellerResponse.rejectionReason]})`}
                    {data.problem.sellerResponse.note &&
                      `: “${data.problem.sellerResponse.note}”`}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No reply by {formatDateTime(data.problem.sellerReplyBy)}.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {data.problem.policy && <PolicySnapshot problem={data.problem} />}

          <section aria-labelledby="items-heading" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="items-heading">
              What was ordered
            </Heading>
            <ul className="flex flex-col gap-1 text-sm">
              {data.order.items.map((item) => (
                <li key={item.listingId}>
                  {item.quantity} × {item.title} — {formatMoney(item.lineTotal)}
                </li>
              ))}
            </ul>
          </section>

          {data.problem.resolution ? (
            <Text>
              Decided:{" "}
              <strong>{DISPUTE_OUTCOME_LABELS[data.problem.resolution.outcome]}</strong>
              {data.problem.resolution.refund &&
                ` (${formatMoney(data.problem.resolution.refund)})`}
              {data.problem.resolution.decidedBy === "seller" && " — by the seller"}
              {data.problem.resolution.note && ` — “${data.problem.resolution.note}”`}
              {(data.problem.status === "return_in_transit" ||
                data.problem.status === "inspecting") &&
                ". Waiting for the item to reach the seller; the refund goes out then."}
            </Text>
          ) : (
            <DecisionForm
              detail={data}
              onDecided={async () => {
                await queryClient.invalidateQueries({ queryKey: disputeKeys.all })
                await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
              }}
            />
          )}

          {(data.problem.status === "return_in_transit" ||
            data.problem.status === "inspecting") && (
            <div>
              <ReasonDialog
                trigger="Mark return received"
                title="Close this return and refund the buyer?"
                description="Use this when the seller has the item but didn't confirm it (tracking shows it delivered, or the seller told support). The buyer is refunded now."
                confirmLabel="Close and refund"
                onConfirm={async (reason) => {
                  queryClient.setQueryData(
                    disputeKeys.detail(data.problem.id),
                    await closeReturn(data.problem.id, reason)
                  )
                  await queryClient.invalidateQueries({ queryKey: disputeKeys.all })
                  toast.success("Return closed — the buyer is refunded")
                }}
              />
            </div>
          )}

          <PendingDecision detail={data} />
          <CaseHandling detail={data} />
          <InternalNotes kind="disputes" id={data.problem.id} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
