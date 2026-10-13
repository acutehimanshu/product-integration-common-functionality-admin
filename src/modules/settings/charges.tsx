import { useState } from "react"
import { Link } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  CHARGE_COMPONENTS,
  CHARGE_COMPONENT_LABELS,
  CHARGE_METHODS,
  CHARGE_METHOD_LABELS,
  CHARGE_SCOPES,
  CHARGE_SCOPE_LABELS,
  type ChargeComponent,
  type ChargeMethod,
  type ChargeRule,
  type ChargeScope,
} from "@acutehimanshu/core/domain/charges"
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

const keys = { all: ["admin", "charges"] as const }

type Draft = {
  name: string
  component: ChargeComponent
  scope: ChargeScope
  method: ChargeMethod
  payer: "buyer" | "seller"
  amount: string
  percent: string
  min: string
  max: string
  externalSource: string
  country: string
  retired: boolean
}

const major = (minor?: number) => (minor === undefined ? "" : String(minor / 100))
const minor = (text: string) =>
  text.trim() === "" || !Number.isFinite(Number(text))
    ? undefined
    : Math.round(Number(text) * 100)

const draftOf = (rule?: ChargeRule): Draft => ({
  name: rule?.name ?? "",
  component: rule?.component ?? "service_fee",
  scope: rule?.scope ?? "seller_order",
  method: rule?.method ?? "percent",
  payer: rule?.payer ?? "buyer",
  amount: major(rule?.amount),
  percent: rule?.percent === undefined ? "" : String(rule.percent),
  min: major(rule?.min),
  max: major(rule?.max),
  externalSource: rule?.externalSource ?? "",
  country: rule?.conditions.country ?? "",
  retired: rule?.status === "retired",
})

const bodyOf = (draft: Draft) => ({
  name: draft.name.trim(),
  component: draft.component,
  scope: draft.scope,
  method: draft.method,
  payer: draft.payer,
  amount: minor(draft.amount),
  percent: draft.percent.trim() === "" ? undefined : Number(draft.percent),
  min: minor(draft.min),
  max: minor(draft.max),
  externalSource: draft.externalSource.trim() || undefined,
  conditions: { country: draft.country || null, categoryId: null, sellerType: null },
  status: draft.retired ? "retired" : "active",
})

function Select<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: T
  options: ReadonlyArray<[T, string]>
  onChange: (value: T) => void
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

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

function ChargeEditor({
  rule,
  onSaved,
}: Readonly<{ rule?: ChargeRule; onSaved: () => Promise<unknown> }>) {
  const [draft, setDraft] = useState(() => draftOf(rule))
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const id = rule?.id ?? "new"
  return (
    <ReasonDialog
      trigger={rule ? "Edit" : "Add a charge"}
      triggerVariant={rule ? "outline" : "default"}
      triggerLabel={rule ? `Edit ${rule.name}` : undefined}
      title={rule ? `Edit “${rule.name}”` : "Add a charge"}
      description="Applies to new checkouts only; orders keep the charges they were placed with. Amounts in the order's currency."
      confirmLabel="Save"
      noteRequired
      validate={() => (draft.name.trim().length < 2 ? "Name the charge." : null)}
      onConfirm={async (reason, note) => {
        const body = { ...bodyOf(draft), reason, note }
        if (rule) await api.put(`/admin/charges/${rule.id}`, body)
        else await api.post("/admin/charges", body)
        await onSaved()
        if (!rule) setDraft(draftOf())
        toast.success("Charge saved")
      }}
      fields={
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id={`${id}-name`}
            label="Name"
            value={draft.name}
            onChange={(v) => set({ name: v })}
          />
          <Select
            id={`${id}-component`}
            label="Kind"
            value={draft.component}
            options={CHARGE_COMPONENTS.map((c) => [c, CHARGE_COMPONENT_LABELS[c]])}
            onChange={(v) => set({ component: v })}
          />
          <Select
            id={`${id}-scope`}
            label="Charged on"
            value={draft.scope}
            options={CHARGE_SCOPES.map((s) => [s, CHARGE_SCOPE_LABELS[s]])}
            onChange={(v) => set({ scope: v })}
          />
          <Select
            id={`${id}-payer`}
            label="Paid by"
            value={draft.payer}
            options={[
              ["buyer", "The buyer (added to their total)"],
              ["seller", "The seller (taken from the payout)"],
            ]}
            onChange={(v) => set({ payer: v })}
          />
          <Select
            id={`${id}-method`}
            label="Worked out as"
            value={draft.method}
            options={CHARGE_METHODS.filter((m) => m !== "tiered").map((m) => [
              m,
              CHARGE_METHOD_LABELS[m],
            ])}
            onChange={(v) => set({ method: v })}
          />
          {draft.method === "percent" && (
            <Field
              id={`${id}-percent`}
              label="Percent"
              value={draft.percent}
              onChange={(v) => set({ percent: v })}
            />
          )}
          {(draft.method === "fixed" || draft.method === "manual") && (
            <Field
              id={`${id}-amount`}
              label="Amount"
              value={draft.amount}
              onChange={(v) => set({ amount: v })}
            />
          )}
          {draft.method === "external" && (
            <Field
              id={`${id}-external`}
              label="Partner"
              value={draft.externalSource}
              onChange={(v) => set({ externalSource: v })}
            />
          )}
          <Field
            id={`${id}-min`}
            label="At least (optional)"
            value={draft.min}
            onChange={(v) => set({ min: v })}
          />
          <Field
            id={`${id}-max`}
            label="At most (optional)"
            value={draft.max}
            onChange={(v) => set({ max: v })}
          />
          <Field
            id={`${id}-country`}
            label="Only in country (code, optional)"
            value={draft.country}
            onChange={(v) => set({ country: v.toUpperCase() })}
          />
          {rule && (
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={draft.retired}
                onChange={(e) => set({ retired: e.target.checked })}
              />
              Retired
            </label>
          )}
        </div>
      }
    />
  )
}

/** Admin › Settings › Charges (FRD-06 PFS-030..039, FRD-02 CFG-038/040). */
export function ChargesScreen() {
  usePageTitle("Charges")
  const queryClient = useQueryClient()
  const charges = useQuery({
    queryKey: keys.all,
    queryFn: ({ signal }) => api.get<ChargeRule[]>("/admin/charges", { signal }),
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
          <Heading>Charges</Heading>
          <Text variant="muted">
            Service and payment fees, insurance, markup, discounts and subsidies. The most
            specific rule wins per kind. With none, checkout is unchanged.
          </Text>
        </div>
        <ChargeEditor onSaved={refresh} />
      </div>
      {charges.error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(charges.error, "Couldn't load charges.")}
        </Text>
      )}
      {charges.isPending && <Skeleton className="h-32" />}
      {charges.data && charges.data.length === 0 && (
        <Text variant="muted">No charges yet.</Text>
      )}
      {charges.data && charges.data.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Charges">
          {charges.data.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {rule.name}
                  <Badge variant="outline">
                    {CHARGE_COMPONENT_LABELS[rule.component]}
                  </Badge>
                  {rule.status === "retired" && <Badge variant="outline">Retired</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {CHARGE_METHOD_LABELS[rule.method]} · {CHARGE_SCOPE_LABELS[rule.scope]}{" "}
                  · paid by the {rule.payer}
                  {rule.conditions.country ? ` · ${rule.conditions.country} only` : ""}
                </span>
              </div>
              <ChargeEditor rule={rule} onSaved={refresh} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
