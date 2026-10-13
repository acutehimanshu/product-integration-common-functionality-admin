import type { MarketplaceSettings } from "@acutehimanshu/core/marketplace-settings"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"

type ReviewSettings = MarketplaceSettings["reviews"]

/** The Reviews section's inputs as typed. */
export type ReviewDraft = {
  windowDays: string
  editHours: string
  dimensions: string
  preModeration: boolean
  duringCase: ReviewSettings["duringCase"]
  syncToRatingHub: boolean
}

export function reviewDraftOf(settings: ReviewSettings): ReviewDraft {
  return {
    windowDays: settings.windowDays === null ? "" : String(settings.windowDays),
    editHours: settings.editHours === null ? "" : String(settings.editHours),
    dimensions: settings.dimensions.join(", "),
    preModeration: settings.preModeration,
    duringCase: settings.duringCase,
    syncToRatingHub: settings.syncToRatingHub ?? false,
  }
}

const wholeOrNull = (text: string): number | null | undefined => {
  if (text.trim() === "") return null
  const value = Number(text)
  return Number.isInteger(value) && value >= 1 ? value : undefined
}

/** The settings to save, or what's wrong with the draft. */
export function reviewSettingsOf(
  draft: ReviewDraft
): { settings: ReviewSettings } | { problem: string } {
  const windowDays = wholeOrNull(draft.windowDays)
  const editHours = wholeOrNull(draft.editHours)
  if (windowDays === undefined)
    return { problem: "Reviews: days to review must be a whole number, or empty." }
  if (editHours === undefined)
    return { problem: "Reviews: hours to edit must be a whole number, or empty." }
  const dimensions = draft.dimensions
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
  if (dimensions.length > 5) return { problem: "Reviews: up to 5 things to rate." }
  return {
    settings: {
      windowDays,
      editHours,
      dimensions,
      preModeration: draft.preModeration,
      duringCase: draft.duringCase,
      syncToRatingHub: draft.syncToRatingHub,
    },
  }
}

/** Reviews (FRD-07 RVW-058..071); empty fields keep things as before. */
export function ReviewFields({
  draft,
  onChange,
}: Readonly<{ draft: ReviewDraft; onChange: (draft: ReviewDraft) => void }>) {
  const set = (patch: Partial<ReviewDraft>) => onChange({ ...draft, ...patch })
  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="reviews-heading">
        Reviews
      </Heading>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-window">Days after delivery to review</Label>
          <Input
            id="review-window"
            type="number"
            min={1}
            className="w-24"
            placeholder="No limit"
            value={draft.windowDays}
            onChange={(e) => set({ windowDays: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-edit">Hours to edit a review</Label>
          <Input
            id="review-edit"
            type="number"
            min={1}
            className="w-24"
            placeholder="No edits"
            value={draft.editHours}
            onChange={(e) => set({ editHours: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-dimensions">Also rate (comma-separated)</Label>
          <Input
            id="review-dimensions"
            className="sm:w-80"
            placeholder="Communication, Delivery, As described"
            value={draft.dimensions}
            onChange={(e) => set({ dimensions: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-during-case">With a problem case open</Label>
          <NativeSelect
            id="review-during-case"
            value={draft.duringCase}
            onChange={(e) =>
              set({ duringCase: e.target.value as ReviewSettings["duringCase"] })
            }
          >
            <option value="after_settled">Review once it&apos;s settled</option>
            <option value="anytime">Review any time</option>
          </NativeSelect>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.preModeration}
          onChange={(e) => set({ preModeration: e.target.checked })}
        />
        Marketbase checks each review before it&apos;s published
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.syncToRatingHub}
          onChange={(e) => set({ syncToRatingHub: e.target.checked })}
        />
        Send published reviews to RatingHub (first name only, no contact details)
      </label>
    </section>
  )
}
