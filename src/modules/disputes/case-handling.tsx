import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { DisputeDetail } from "@acutehimanshu/core/domain/admin-disputes"
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  caseTimeline,
  type CasePriority,
} from "@acutehimanshu/core/domain/case-thread"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { useAdmin } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"
import { disputeKeys } from "@/modules/disputes/api"

/**
 * Handling a case (FRD-07 DSP-040..047): who has it, how urgent it is,
 * evidence asked of a party with a deadline, messages both sides read, and
 * the timeline. Admin-only notes stay in InternalNotes.
 */
export function CaseHandling({ detail }: Readonly<{ detail: DisputeDetail }>) {
  const queryClient = useQueryClient()
  const me = useAdmin().data
  const problem = detail.problem
  const id = problem.id
  const [priority, setPriority] = useState<CasePriority>(problem.priority ?? "normal")
  const [from, setFrom] = useState<"buyer" | "seller">("seller")
  const [what, setWhat] = useState("")
  const [days, setDays] = useState("3")
  const [message, setMessage] = useState("")
  const refresh = () => queryClient.invalidateQueries({ queryKey: disputeKeys.all })
  const open = problem.status !== "resolved"
  return (
    <Card>
      <CardHeader>
        <Heading as="h2" size="h3">
          Case handling
        </Heading>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          {problem.assignee ? `Assigned to ${problem.assignee.name}` : "Not assigned"} ·
          priority {CASE_PRIORITY_LABELS[problem.priority ?? "normal"].toLowerCase()}
        </p>
        <div className="flex flex-wrap gap-2">
          {me && problem.assignee?.id !== me.id && (
            <ReasonDialog
              trigger="Assign to me"
              triggerVariant="outline"
              title="Take this case?"
              description="You become the admin handling it."
              confirmLabel="Assign to me"
              onConfirm={async (reason) => {
                await api.post(`/admin/disputes/${id}/assign`, { adminId: me.id, reason })
                await refresh()
                toast.success("Assigned to you")
              }}
            />
          )}
          {problem.assignee && (
            <ReasonDialog
              trigger="Unassign"
              triggerVariant="outline"
              title="Unassign this case?"
              description="It goes back to the shared queue."
              confirmLabel="Unassign"
              onConfirm={async (reason) => {
                await api.post(`/admin/disputes/${id}/assign`, { adminId: null, reason })
                await refresh()
              }}
            />
          )}
          <ReasonDialog
            trigger="Priority"
            triggerVariant="outline"
            title="Change the priority?"
            description="Higher priority cases come first in the queue."
            confirmLabel="Save"
            fields={
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-priority`}>Priority</Label>
                <NativeSelect
                  id={`${id}-priority`}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CasePriority)}
                >
                  {CASE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {CASE_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            }
            onConfirm={async (reason) => {
              await api.post(`/admin/disputes/${id}/priority`, { priority, reason })
              await refresh()
            }}
          />
          {open && (
            <ReasonDialog
              trigger="Ask for evidence"
              triggerVariant="outline"
              title="Ask a party for evidence"
              description="They're told and can answer on the case. Past the deadline, you decide without it."
              confirmLabel="Ask"
              validate={() => (what.trim().length < 5 ? "Say what you need." : null)}
              fields={
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${id}-from`}>From</Label>
                    <NativeSelect
                      id={`${id}-from`}
                      value={from}
                      onChange={(e) => setFrom(e.target.value as "buyer" | "seller")}
                    >
                      <option value="seller">The seller</option>
                      <option value="buyer">The buyer</option>
                    </NativeSelect>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor={`${id}-what`}>What you need</Label>
                    <Input
                      id={`${id}-what`}
                      value={what}
                      onChange={(e) => setWhat(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${id}-days`}>Days to answer</Label>
                    <Input
                      id={`${id}-days`}
                      type="number"
                      min={1}
                      max={14}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </div>
                </div>
              }
              onConfirm={async (reason) => {
                await api.post(`/admin/disputes/${id}/evidence-requests`, {
                  from,
                  what: what.trim(),
                  days: Number(days) || 3,
                  reason,
                })
                setWhat("")
                await refresh()
                toast.success("Asked")
              }}
            />
          )}
        </div>
        {open && (
          <form
            aria-label="Message both sides"
            className="flex flex-col gap-2"
            onSubmit={async (event) => {
              event.preventDefault()
              await api.post(`/admin/disputes/${id}/messages`, { text: message.trim() })
              setMessage("")
              await refresh()
              toast.success("Sent to the buyer and seller")
            }}
          >
            <Label htmlFor={`${id}-message`}>Message the buyer and seller</Label>
            <Textarea
              id={`${id}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              className="self-start text-sm font-medium underline"
              disabled={message.trim().length < 2}
            >
              Send message
            </button>
          </form>
        )}
        {(problem.messages ?? []).length > 0 && (
          <ol aria-label="Messages" className="flex flex-col gap-2">
            {(problem.messages ?? []).map((m) => (
              <li key={m.id} className="rounded-lg border p-2">
                <p className="text-muted-foreground text-xs">
                  {m.author} · {formatDateTime(m.at)}
                </p>
                <p>{m.text}</p>
              </li>
            ))}
          </ol>
        )}
        <details>
          <summary className="cursor-pointer font-medium">Timeline</summary>
          <ol className="mt-2 flex flex-col gap-1" aria-label="Timeline">
            {caseTimeline(problem).map((event) => (
              <li key={`${event.at}-${event.label}`}>
                {formatDateTime(event.at)} — {event.label}
              </li>
            ))}
          </ol>
        </details>
      </CardContent>
    </Card>
  )
}
