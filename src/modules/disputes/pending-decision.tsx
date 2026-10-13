import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DISPUTE_OUTCOME_LABELS,
  DISPUTE_REASON_LABELS,
  type DisputeDetail,
} from "@acutehimanshu/core/domain/admin-disputes"
import { formatMoney } from "@acutehimanshu/core/money"
import { lookup } from "@acutehimanshu/core/lookup"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { disputeKeys } from "@/modules/disputes/api"

/**
 * A high-value decision waiting for a second admin (FRD-07 DSP-050). The
 * admin who proposed it can't approve it — the backend refuses that too.
 */
export function PendingDecision({ detail }: Readonly<{ detail: DisputeDetail }>) {
  const queryClient = useQueryClient()
  const pending = detail.problem.pendingDecision
  if (!pending) return null
  const id = detail.problem.id
  const refresh = () => queryClient.invalidateQueries({ queryKey: disputeKeys.all })
  return (
    <section
      aria-labelledby="pending-heading"
      className="flex flex-col gap-2 rounded-xl border border-amber-500/50 p-4 text-sm"
    >
      <Heading as="h2" size="h3" id="pending-heading">
        Waiting for a second admin
      </Heading>
      <p>
        {pending.by.name} proposed: {DISPUTE_OUTCOME_LABELS[pending.outcome]}
        {pending.refund && ` (${formatMoney(pending.refund)})`} —{" "}
        {lookup(DISPUTE_REASON_LABELS, pending.reasonCode) ?? pending.reasonCode},{" "}
        {formatDateTime(pending.at)}.
      </p>
      <p className="text-muted-foreground">“{pending.reason}”</p>
      <div className="flex flex-wrap gap-2">
        <ReasonDialog
          trigger="Approve"
          title="Approve this decision?"
          description="It takes effect now: refunds go out and both sides are told."
          confirmLabel="Approve"
          noteRequired
          onConfirm={async (reason, note) => {
            await api.post(`/admin/disputes/${id}/approve`, { reason, note })
            await refresh()
            toast.success("Approved")
          }}
        />
        <ReasonDialog
          trigger="Turn down"
          triggerVariant="outline"
          title="Turn down this decision?"
          description="The case stays open for a new decision."
          confirmLabel="Turn down"
          onConfirm={async (reason) => {
            await api.post(`/admin/disputes/${id}/reject-decision`, { reason })
            await refresh()
          }}
        />
      </div>
    </section>
  )
}
