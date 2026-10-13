import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Order } from "@acutehimanshu/core/domain/orders"
import { DEFAULT_RETURN_REASONS } from "@acutehimanshu/core/domain/return-policy"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { orderKeys } from "@/modules/orders/api"

/**
 * Opening a problem case outside the return policy — after the window, or
 * on an item that isn't returnable (FRD-07 ELG-010). Marketbase then decides it
 * in Disputes. A big action: reason and internal note.
 */
export function OpenCase({ order }: Readonly<{ order: Order }>) {
  const queryClient = useQueryClient()
  const [problemReason, setProblemReason] = useState("damaged")
  const [details, setDetails] = useState("")
  const [wants, setWants] = useState<"refund" | "return_and_refund">("refund")
  if (order.problem || !order.deliveredAt) return null
  return (
    <ReasonDialog
      trigger="Open a problem case"
      triggerVariant="outline"
      title="Open a case outside the return policy?"
      description="For a request the policy doesn't allow any more. Marketbase decides it in Disputes; the seller is told."
      confirmLabel="Open case"
      noteRequired
      validate={() =>
        details.trim().length < 10
          ? "Say what the buyer reported (a sentence or two)."
          : null
      }
      onConfirm={async (reason, note) => {
        await api.post(`/admin/orders/${order.id}/problems`, {
          problemReason,
          details: details.trim(),
          wants,
          reason,
          note,
        })
        await queryClient.invalidateQueries({ queryKey: orderKeys.all })
        toast.success("Case opened — find it in Disputes")
      }}
      fields={
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-reason">Problem</Label>
            <NativeSelect
              id="case-reason"
              value={problemReason}
              onChange={(e) => setProblemReason(e.target.value)}
            >
              {DEFAULT_RETURN_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-details">What the buyer reported</Label>
            <Textarea
              id="case-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="case-wants">They want</Label>
            <NativeSelect
              id="case-wants"
              value={wants}
              onChange={(e) => setWants(e.target.value as typeof wants)}
            >
              <option value="refund">A refund</option>
              <option value="return_and_refund">To send it back for a refund</option>
            </NativeSelect>
          </div>
        </div>
      }
    />
  )
}
