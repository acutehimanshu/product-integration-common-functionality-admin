import { useState } from "react"
import { Link } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  COUNTER_STRATEGIES,
  COUNTER_STRATEGY_LABELS,
  type CounterStrategy,
  type NegotiationRule,
} from "@acutehimanshu/core/domain/negotiation"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"

const keys = { all: ["admin", "negotiation-rules"] as const }

type Draft = {
  name: string
  country: string
  categoryId: string
  sellerType: "" | "individual" | "business"
  sellerId: string
  enabled: boolean
  autoAccept: string
  counter: "" | CounterStrategy
  counterPercent: string
  floor: string
  manualAbove: string
  allowWithdraw: boolean
  maxQuantity: string
  retired: boolean
}

const text = (n: number | null | undefined) => (n == null ? "" : String(n))
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s))

const draftOf = (rule?: NegotiationRule): Draft => ({
  name: rule?.name ?? "",
  country: rule?.conditions.country ?? "",
  categoryId: rule?.conditions.categoryId ?? "",
  sellerType: rule?.conditions.sellerType ?? "",
  sellerId: rule?.conditions.sellerId ?? "",
  enabled: rule?.enabled ?? true,
  autoAccept: text(rule?.autoAcceptPercent),
  counter: rule?.autoCounter?.strategy ?? "",
  counterPercent: text(rule?.autoCounter?.percent),
  floor: text(rule?.hardFloorPercent),
  manualAbove: rule?.manualAbove == null ? "" : String(rule.manualAbove / 100),
  allowWithdraw: rule?.allowWithdraw ?? false,
  maxQuantity: String(rule?.maxQuantity ?? 1),
  retired: rule?.status === "retired",
})

const bodyOf = (d: Draft) => ({
  name: d.name.trim(),
  conditions: {
    country: d.country || null,
    categoryId: d.categoryId.trim() || null,
    sellerType: d.sellerType || null,
    sellerId: d.sellerId.trim() || null,
  },
  enabled: d.enabled,
  autoAcceptPercent: numOrNull(d.autoAccept),
  autoCounter: d.counter
    ? { strategy: d.counter, percent: numOrNull(d.counterPercent) ?? undefined }
    : null,
  hardFloorPercent: numOrNull(d.floor),
  manualAbove:
    d.manualAbove.trim() === "" ? null : Math.round(Number(d.manualAbove) * 100),
  allowWithdraw: d.allowWithdraw,
  maxQuantity: Number(d.maxQuantity) || 1,
  status: d.retired ? "retired" : "active",
})

function Field({
  id,
  label,
  value,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Check({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function RuleEditor({
  rule,
  onSaved,
}: Readonly<{ rule?: NegotiationRule; onSaved: () => Promise<unknown> }>) {
  const [draft, setDraft] = useState(() => draftOf(rule))
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const id = rule?.id ?? "new-negotiation"
  return (
    <ReasonDialog
      trigger={rule ? "Edit" : "Add a rule"}
      triggerVariant={rule ? "outline" : "default"}
      triggerLabel={rule ? `Edit ${rule.name}` : undefined}
      title={rule ? `Edit “${rule.name}”` : "Add a negotiation rule"}
      description="Applies to offers made from now on; open offers keep the rule they started under. Percentages are of the listing price."
      confirmLabel="Save"
      noteRequired
      validate={() => (draft.name.trim().length < 2 ? "Name the rule." : null)}
      onConfirm={async (reason, note) => {
        const body = { ...bodyOf(draft), reason, note }
        if (rule) await api.put(`/admin/negotiation-rules/${rule.id}`, body)
        else await api.post("/admin/negotiation-rules", body)
        await onSaved()
        if (!rule) setDraft(draftOf())
        toast.success("Rule saved")
      }}
      fields={
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id={`${id}-name`}
            label="Name"
            value={draft.name}
            onChange={(v) => set({ name: v })}
          />
          <Field
            id={`${id}-country`}
            label="Country (code, optional)"
            value={draft.country}
            onChange={(v) => set({ country: v.toUpperCase() })}
          />
          <Field
            id={`${id}-category`}
            label="Category id (optional)"
            value={draft.categoryId}
            onChange={(v) => set({ categoryId: v })}
          />
          <Field
            id={`${id}-seller`}
            label="Seller id (optional)"
            value={draft.sellerId}
            onChange={(v) => set({ sellerId: v })}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-type`}>Seller type</Label>
            <NativeSelect
              id={`${id}-type`}
              value={draft.sellerType}
              onChange={(e) => set({ sellerType: e.target.value as Draft["sellerType"] })}
            >
              <option value="">Any</option>
              <option value="individual">Private sellers</option>
              <option value="business">Business sellers</option>
            </NativeSelect>
          </div>
          <Field
            id={`${id}-accept`}
            label="Accept automatically from (% of price)"
            value={draft.autoAccept}
            onChange={(v) => set({ autoAccept: v })}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-counter`}>Counter automatically</Label>
            <NativeSelect
              id={`${id}-counter`}
              value={draft.counter}
              onChange={(e) => set({ counter: e.target.value as Draft["counter"] })}
            >
              <option value="">Never</option>
              {COUNTER_STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {COUNTER_STRATEGY_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </div>
          {draft.counter === "fixed_percent" && (
            <Field
              id={`${id}-counter-pct`}
              label="Counter at (% of price)"
              value={draft.counterPercent}
              onChange={(v) => set({ counterPercent: v })}
            />
          )}
          <Field
            id={`${id}-floor`}
            label="Hard floor (% of price)"
            value={draft.floor}
            onChange={(v) => set({ floor: v })}
          />
          <Field
            id={`${id}-manual`}
            label="Seller decides above (price)"
            value={draft.manualAbove}
            onChange={(v) => set({ manualAbove: v })}
          />
          <Field
            id={`${id}-qty`}
            label="Units per offer"
            value={draft.maxQuantity}
            onChange={(v) => set({ maxQuantity: v })}
          />
          <Check
            label="Offers allowed"
            checked={draft.enabled}
            onChange={(v) => set({ enabled: v })}
          />
          <Check
            label="Either side may withdraw their price"
            checked={draft.allowWithdraw}
            onChange={(v) => set({ allowWithdraw: v })}
          />
          {rule && (
            <Check
              label="Retired"
              checked={draft.retired}
              onChange={(v) => set({ retired: v })}
            />
          )}
        </div>
      }
    />
  )
}

/** Admin › Settings › Negotiation (FRD-08 NEG-001..031, FRD-02 CFG-035). */
export function NegotiationScreen() {
  usePageTitle("Negotiation")
  const queryClient = useQueryClient()
  const rules = useQuery({
    queryKey: keys.all,
    queryFn: ({ signal }) =>
      api.get<NegotiationRule[]>("/admin/negotiation-rules", { signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.all })
  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Settings
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading>Negotiation</Heading>
          <Text variant="muted">
            Where offers are allowed and what Marketbase answers for the seller. The most
            specific rule wins; with none, every answer is the seller&apos;s.
          </Text>
        </div>
        <RuleEditor onSaved={refresh} />
      </div>
      {rules.error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(rules.error, "Couldn't load the rules.")}
        </Text>
      )}
      {rules.isPending && <Skeleton className="h-32" />}
      {rules.data?.length === 0 && <Text variant="muted">No rules yet.</Text>}
      {rules.data && rules.data.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Rules"
        >
          {rules.data.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {rule.name}
                  {!rule.enabled && <Badge variant="outline">Offers off</Badge>}
                  {rule.status === "retired" && <Badge variant="outline">Retired</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {rule.autoAcceptPercent !== null &&
                    `accept from ${rule.autoAcceptPercent}% · `}
                  {rule.autoCounter &&
                    `${COUNTER_STRATEGY_LABELS[rule.autoCounter.strategy]} · `}
                  {rule.hardFloorPercent !== null && `floor ${rule.hardFloorPercent}% · `}
                  {[
                    rule.conditions.country,
                    rule.conditions.categoryId,
                    rule.conditions.sellerType,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Everywhere"}
                </span>
              </div>
              <RuleEditor rule={rule} onSaved={refresh} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
