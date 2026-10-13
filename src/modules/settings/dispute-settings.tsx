import type { MarketplaceSettings } from "@acutehimanshu/core/marketplace-settings"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"

type DisputeSettings = MarketplaceSettings["disputes"]

/** The Disputes section's inputs as typed (amounts in major units). */
export type DisputeDraft = {
  approvalAbove: string
  appealDays: string
  maxAppeals: string
  decisionDays: string
}

export function disputeDraftOf(settings: DisputeSettings): DisputeDraft {
  return {
    approvalAbove:
      settings.approvalAbove === null ? "" : String(settings.approvalAbove / 100),
    appealDays: settings.appealDays === null ? "" : String(settings.appealDays),
    maxAppeals: String(settings.maxAppeals),
    decisionDays: String(settings.decisionDays),
  }
}

/** The settings to save, or what's wrong with the draft. */
export function disputeSettingsOf(
  draft: DisputeDraft
): { settings: DisputeSettings } | { problem: string } {
  const above = draft.approvalAbove.trim() === "" ? null : Number(draft.approvalAbove)
  const days = draft.appealDays.trim() === "" ? null : Number(draft.appealDays)
  const max = Number(draft.maxAppeals)
  const decisionDays = Number(draft.decisionDays)
  if (above !== null && (Number.isNaN(above) || above <= 0))
    return { problem: "Second approval: enter an amount above 0, or leave it empty." }
  if (days !== null && !(Number.isInteger(days) && days >= 1 && days <= 60))
    return { problem: "Appeals: enter 1 to 60 days, or leave it empty." }
  if (!(Number.isInteger(max) && max >= 1 && max <= 5))
    return { problem: "Appeals: allow 1 to 5 per case." }
  if (!(Number.isInteger(decisionDays) && decisionDays >= 1 && decisionDays <= 30))
    return { problem: "Disputes: decide within 1 to 30 days." }
  return {
    settings: {
      approvalAbove: above === null ? null : Math.round(above * 100),
      appealDays: days,
      maxAppeals: max,
      decisionDays,
    },
  }
}

/** Disputes (FRD-07 DSP-050/051): second approval and appeals, both off when empty. */
export function DisputeFields({
  draft,
  onChange,
}: Readonly<{ draft: DisputeDraft; onChange: (draft: DisputeDraft) => void }>) {
  const set = (patch: Partial<DisputeDraft>) => onChange({ ...draft, ...patch })
  return (
    <section aria-labelledby="disputes-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="disputes-heading">
        Disputes
      </Heading>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approval-above">Second admin approves refunds above</Label>
          <Input
            id="approval-above"
            type="number"
            min={0}
            className="w-32"
            placeholder="Off"
            value={draft.approvalAbove}
            onChange={(e) => set({ approvalAbove: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="appeal-days">Days to appeal a decision</Label>
          <Input
            id="appeal-days"
            type="number"
            min={1}
            className="w-24"
            placeholder="Off"
            value={draft.appealDays}
            onChange={(e) => set({ appealDays: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decision-days">Decide escalated cases within (days)</Label>
          <Input
            id="decision-days"
            type="number"
            min={1}
            max={30}
            className="w-24"
            value={draft.decisionDays}
            onChange={(e) => set({ decisionDays: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max-appeals">Appeals per case</Label>
          <Input
            id="max-appeals"
            type="number"
            min={1}
            max={5}
            className="w-24"
            value={draft.maxAppeals}
            onChange={(e) => set({ maxAppeals: e.target.value })}
          />
        </div>
      </div>
    </section>
  )
}
