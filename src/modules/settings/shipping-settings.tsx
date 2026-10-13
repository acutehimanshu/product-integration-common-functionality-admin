import type { ShippingSettings } from "@acutehimanshu/core/marketplace-settings"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"

/** The Shipping section's inputs as typed (amounts in major units). */
export type ShippingDraft = {
  manualCountries: string
  freeOn: boolean
  freeMin: string
  sellerShare: string
  highThreshold: string
  insurancePercent: string
}

const major = (minor: number | null): string =>
  minor === null ? "" : String(minor / 100)

export function shippingDraftOf(settings: ShippingSettings): ShippingDraft {
  return {
    manualCountries: settings.manualCountries.join(", "),
    freeOn: settings.freeShipping.enabled,
    freeMin: major(settings.freeShipping.minSubtotal),
    sellerShare: String(settings.freeShipping.sellerSharePercent),
    highThreshold: major(settings.highValue.threshold),
    insurancePercent: String(settings.highValue.insurancePercent),
  }
}

/** Blank = null; otherwise a non-negative amount in minor units, or NaN. */
function minorOf(value: string): number | null {
  if (value.trim() === "") return null
  const amount = Number(value)
  return amount >= 0 ? Math.round(amount * 100) : Number.NaN
}

/** The settings to save, or what's wrong with the draft. */
export function shippingSettingsOf(
  draft: ShippingDraft
): { settings: ShippingSettings } | { problem: string } {
  const minSubtotal = minorOf(draft.freeMin)
  const threshold = minorOf(draft.highThreshold)
  const sellerSharePercent = Number(draft.sellerShare)
  const insurancePercent = Number(draft.insurancePercent)
  if (Number.isNaN(minSubtotal))
    return { problem: "Free delivery: enter a minimum of 0 or more." }
  if (!(sellerSharePercent >= 0 && sellerSharePercent <= 100))
    return { problem: "Free delivery: the seller's share is a percentage from 0 to 100." }
  if (Number.isNaN(threshold) || threshold === 0)
    return { problem: "High-value parcels: enter an amount above 0, or leave it empty." }
  if (!(insurancePercent >= 0 && insurancePercent <= 10))
    return { problem: "High-value parcels: insurance is a percentage from 0 to 10." }
  const settings: ShippingSettings = {
    manualCountries: draft.manualCountries
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter((code) => /^[A-Z]{2}$/.test(code)),
    freeShipping: { enabled: draft.freeOn, minSubtotal, sellerSharePercent },
    highValue: { threshold, insurancePercent },
  }
  return { settings }
}

/**
 * Shipping settings (FRD-06): own couriers (PFS-058), free delivery and who
 * funds it (PFS-055/056), and insured delivery for high-value parcels (PFS-057).
 */
export function ShippingFields({
  draft,
  onChange,
}: Readonly<{ draft: ShippingDraft; onChange: (draft: ShippingDraft) => void }>) {
  const set = (patch: Partial<ShippingDraft>) => onChange({ ...draft, ...patch })
  return (
    <section aria-labelledby="shipping-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="shipping-heading">
        Shipping
      </Heading>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="manual-countries">
          Sellers may use their own courier in (country codes)
        </Label>
        <Input
          id="manual-countries"
          className="sm:w-96"
          value={draft.manualCountries}
          placeholder="Empty = always Marketbase's carrier"
          onChange={(e) => set({ manualCountries: e.target.value })}
        />
        <p className="text-muted-foreground text-xs">
          Their tracking is shown as entered by the seller, not verified.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.freeOn}
          onChange={(e) => set({ freeOn: e.target.checked })}
        />
        Free Standard delivery for buyers
      </label>
      {draft.freeOn && (
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="free-min">From a shop total of</Label>
            <Input
              id="free-min"
              type="number"
              min={0}
              className="w-28"
              value={draft.freeMin}
              placeholder="Always"
              onChange={(e) => set({ freeMin: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seller-share">Seller pays (% of delivery)</Label>
            <Input
              id="seller-share"
              type="number"
              min={0}
              max={100}
              className="w-24"
              value={draft.sellerShare}
              onChange={(e) => set({ sellerShare: e.target.value })}
            />
          </div>
          <p className="text-muted-foreground basis-full text-xs">
            The seller&apos;s share comes off their payout; Marketbase pays the rest.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="high-threshold">Insured delivery from</Label>
          <Input
            id="high-threshold"
            type="number"
            min={1}
            className="w-28"
            value={draft.highThreshold}
            placeholder="Off"
            onChange={(e) => set({ highThreshold: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance-percent">Insurance (% of the items)</Label>
          <Input
            id="insurance-percent"
            type="number"
            min={0}
            max={10}
            step="0.1"
            className="w-24"
            value={draft.insurancePercent}
            onChange={(e) => set({ insurancePercent: e.target.value })}
          />
        </div>
        <p className="text-muted-foreground basis-full text-xs">
          High-value parcels go with Marketbase&apos;s carrier only, with signature on
          delivery.
        </p>
      </div>
    </section>
  )
}
