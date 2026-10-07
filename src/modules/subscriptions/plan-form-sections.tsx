import { useState } from "react"
import {
  CATALOG_STATUS_LABELS,
  LIMITS,
  limitKeysFor,
  type BillingInterval,
  type CatalogStatus,
  type PlanSide,
  type PublicPlan,
} from "@acutehimanshu/core/domain/subscriptions"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { PlanCard } from "@acutehimanshu/ui/components/plan-card"
import { Text } from "@acutehimanshu/ui/components/text"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import type { PlanDraft } from "@/modules/subscriptions/forms"

// The package form's sections (PlanForm in plan-editor.tsx keeps the state).

type SetField = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => void

export function BasicsSection({
  draft,
  set,
  isFree,
}: Readonly<{ draft: PlanDraft; set: SetField; isFree: boolean }>) {
  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Basics">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-name">Name</Label>
        <Input
          id="plan-name"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-badge">Badge (optional)</Label>
        <Input
          id="plan-badge"
          placeholder="Most popular"
          value={draft.badge}
          onChange={(e) => set("badge", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="plan-description">Short description</Label>
        <Input
          id="plan-description"
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-status">Status</Label>
        <NativeSelect
          id="plan-status"
          value={isFree ? "published" : draft.status}
          disabled={isFree}
          onChange={(e) => set("status", e.target.value as CatalogStatus)}
        >
          {(Object.keys(CATALOG_STATUS_LABELS) as CatalogStatus[]).map((status) => (
            <option key={status} value={status}>
              {CATALOG_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
        <span className="text-muted-foreground text-xs">
          Draft: nobody sees it. Hidden: no new subscribers; people on it keep it.
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-order">Position on the page</Label>
        <Input
          id="plan-order"
          type="number"
          min={0}
          className="w-24"
          value={draft.order}
          onChange={(e) => set("order", e.target.value)}
        />
      </div>
    </section>
  )
}

export function LimitsSection({
  draft,
  set,
  isFree,
  side,
}: Readonly<{ draft: PlanDraft; set: SetField; isFree: boolean; side: PlanSide }>) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Limits and credits</legend>
      {limitKeysFor(side).map((key) => {
        const row = draft.limits[key] ?? { unlimited: false, value: "" }
        const setRow = (patch: Partial<typeof row>) =>
          set("limits", { ...draft.limits, [key]: { ...row, ...patch } })
        return (
          <div key={key} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`limit-${key}`}>
                {LIMITS[key].label} ({LIMITS[key].unit})
              </Label>
              <Input
                id={`limit-${key}`}
                type="number"
                min={0}
                className="w-28"
                disabled={row.unlimited}
                value={row.unlimited ? "" : row.value}
                onChange={(e) => setRow({ value: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={row.unlimited}
                onChange={(e) => setRow({ unlimited: e.target.checked })}
              />
              Unlimited
            </label>
          </div>
        )
      })}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-credits">Credits included every month</Label>
        <Input
          id="plan-credits"
          type="number"
          min={0}
          className="w-28"
          value={draft.monthlyCredits}
          onChange={(e) => set("monthlyCredits", e.target.value)}
        />
        <span className="text-muted-foreground text-xs">
          Spent before bought credits; unused ones end with the month.
        </span>
      </div>
      {!isFree && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan-trial">Free trial (days, 0 = none)</Label>
          <Input
            id="plan-trial"
            type="number"
            min={0}
            max={90}
            className="w-28"
            value={draft.trialDays}
            onChange={(e) => set("trialDays", e.target.value)}
          />
        </div>
      )}
    </fieldset>
  )
}

/** Seller packages only. */
export function PerksSection({
  draft,
  set,
}: Readonly<{ draft: PlanDraft; set: SetField }>) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Perks</legend>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-fee">Platform fee on this package (%)</Label>
        <Input
          id="plan-fee"
          type="number"
          min={0}
          max={50}
          step="0.1"
          className="w-28"
          placeholder="Default"
          value={draft.feePercent}
          onChange={(e) => set("feePercent", e.target.value)}
        />
        <span className="text-muted-foreground text-xs">
          Empty = the marketplace fee. Only applies while the marketplace charges a fee.
        </span>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.sellerBadge}
          onChange={(e) => set("sellerBadge", e.target.checked)}
        />
        Show a badge with the package name on the seller&apos;s shop
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.shopProfile}
          onChange={(e) => set("shopProfile", e.target.checked)}
        />
        Shop profile — logo, banner, About, links, policies, pinned listings
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.customShopUrl}
          onChange={(e) => set("customShopUrl", e.target.checked)}
        />
        Custom shop address (/shop/name)
      </label>
    </fieldset>
  )
}

/** The pricing card as people would see it, or the form's first problem. */
export function PreviewPanel({
  plan,
  problem,
}: Readonly<{ plan: PublicPlan | null; problem: string | null }>) {
  const [previewInterval, setPreviewInterval] = useState<BillingInterval>("month")
  return (
    <aside aria-label="Preview" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-medium">Preview</span>
        <Button
          type="button"
          size="xs"
          variant={previewInterval === "month" ? "secondary" : "ghost"}
          onClick={() => setPreviewInterval("month")}
        >
          Monthly
        </Button>
        <Button
          type="button"
          size="xs"
          variant={previewInterval === "year" ? "secondary" : "ghost"}
          onClick={() => setPreviewInterval("year")}
        >
          Yearly
        </Button>
      </div>
      {plan ? (
        <PlanCard plan={plan} interval={previewInterval} />
      ) : (
        <Text variant="muted" className="rounded-xl border p-4">
          {problem}
        </Text>
      )}
    </aside>
  )
}
