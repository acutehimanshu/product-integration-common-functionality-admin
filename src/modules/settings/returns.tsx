import { useState } from "react"
import { Link } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DEFAULT_RETURN_LOGISTICS,
  RETURN_METHODS,
  RETURN_METHOD_LABELS,
  type ReturnLogistics,
  type ReturnMethod,
  RESOLUTION_LABELS,
  RESOLUTION_TYPES,
  RETURN_OUTCOMES,
  RETURN_OUTCOME_LABELS,
  RETURN_SHIPPING_PAYERS,
  type ResolutionType,
  type ReturnOutcome,
  type ReturnPolicyRule,
  type ReturnReason,
  type ReturnShippingPayer,
} from "@acutehimanshu/core/domain/return-policy"
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

type ReturnPolicyView = { reasons: ReturnReason[]; rules: ReturnPolicyRule[] }

const keys = { all: ["admin", "return-policy"] as const }

const PAYER_LABELS: Record<ReturnShippingPayer, string> = {
  seller: "Seller pays the return",
  buyer: "Buyer pays the return",
  platform: "Marketbase pays the return",
}

function ReasonsEditor({
  reasons,
  onSaved,
}: Readonly<{ reasons: ReturnReason[]; onSaved: () => Promise<unknown> }>) {
  const [draft, setDraft] = useState(reasons)
  const [newCode, setNewCode] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const update = (code: string, patch: Partial<ReturnReason>) =>
    setDraft((list) => list.map((r) => (r.code === code ? { ...r, ...patch } : r)))
  const withNew = (): ReturnReason[] =>
    newCode.trim()
      ? [
          ...draft,
          {
            code: newCode.trim(),
            label: newLabel.trim(),
            active: true,
            minPhotos: 0,
            returnShippingPayer: "seller",
          },
        ]
      : draft
  return (
    <ReasonDialog
      trigger="Edit reasons"
      triggerVariant="outline"
      title="Return reasons"
      description="What buyers can pick, the photos each needs and who pays a return. Switch a reason off rather than removing it."
      confirmLabel="Save reasons"
      noteRequired
      onConfirm={async (reason, note) => {
        await api.put("/admin/return-policy/reasons", {
          reasons: withNew(),
          reason,
          note,
        })
        setNewCode("")
        setNewLabel("")
        await onSaved()
        toast.success("Reasons saved")
      }}
      fields={
        <div className="flex flex-col gap-3">
          {draft.map((r) => (
            <fieldset
              key={r.code}
              className="grid gap-2 rounded-lg border p-2 sm:grid-cols-2"
            >
              <legend className="px-1 text-xs">{r.code}</legend>
              <Input
                aria-label={`Label for ${r.code}`}
                value={r.label}
                onChange={(e) => update(r.code, { label: e.target.value })}
              />
              <NativeSelect
                aria-label={`Who pays the return for ${r.code}`}
                value={r.returnShippingPayer}
                onChange={(e) =>
                  update(r.code, {
                    returnShippingPayer: e.target.value as ReturnShippingPayer,
                  })
                }
              >
                {RETURN_SHIPPING_PAYERS.map((p) => (
                  <option key={p} value={p}>
                    {PAYER_LABELS[p]}
                  </option>
                ))}
              </NativeSelect>
              <Input
                type="number"
                min={0}
                max={5}
                aria-label={`Photos required for ${r.code}`}
                value={String(r.minPhotos)}
                onChange={(e) =>
                  update(r.code, { minPhotos: Number(e.target.value) || 0 })
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.active}
                  onChange={(e) => update(r.code, { active: e.target.checked })}
                />
                Offered to buyers
              </label>
            </fieldset>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-reason-code">New reason code (optional)</Label>
              <Input
                id="new-reason-code"
                value={newCode}
                placeholder="changed_mind"
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-reason-label">Its wording</Label>
              <Input
                id="new-reason-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>
        </div>
      }
    />
  )
}

type RuleDraft = {
  name: string
  country: string
  categoryId: string
  sellerType: "" | "individual" | "business"
  outcome: ReturnOutcome
  resolutions: ResolutionType[]
  maxRefundWithoutReturn: string
  method: ReturnMethod
  shipByDays: string
  inspectionDays: string
  onExpiry: ReturnLogistics["onExpiry"]
  retired: boolean
}

const ruleDraftOf = (rule?: ReturnPolicyRule): RuleDraft => ({
  name: rule?.name ?? "",
  country: rule?.conditions.country ?? "",
  categoryId: rule?.conditions.categoryId ?? "",
  sellerType: rule?.conditions.sellerType ?? "",
  outcome: rule?.outcome ?? "returnable",
  resolutions: rule?.resolutions ?? ["refund", "return_and_refund"],
  maxRefundWithoutReturn:
    rule?.maxRefundWithoutReturn == null ? "" : String(rule.maxRefundWithoutReturn / 100),
  method: rule?.logistics?.method ?? DEFAULT_RETURN_LOGISTICS.method,
  shipByDays: String(rule?.logistics?.shipByDays ?? DEFAULT_RETURN_LOGISTICS.shipByDays),
  inspectionDays:
    rule?.logistics?.inspectionDays == null ? "" : String(rule.logistics.inspectionDays),
  onExpiry: rule?.logistics?.onExpiry ?? DEFAULT_RETURN_LOGISTICS.onExpiry,
  retired: rule?.status === "retired",
})

const ruleBodyOf = (draft: RuleDraft) => ({
  name: draft.name.trim(),
  conditions: {
    country: draft.country || null,
    categoryId: draft.categoryId.trim() || null,
    sellerType: draft.sellerType || null,
  },
  outcome: draft.outcome,
  resolutions: draft.outcome === "non_returnable" ? [] : draft.resolutions,
  maxRefundWithoutReturn:
    draft.maxRefundWithoutReturn.trim() === ""
      ? null
      : Math.round(Number(draft.maxRefundWithoutReturn) * 100),
  reasonCodes: [],
  logistics: {
    method: draft.method,
    shipByDays: Number(draft.shipByDays) || DEFAULT_RETURN_LOGISTICS.shipByDays,
    inspectionDays:
      draft.inspectionDays.trim() === "" ? null : Number(draft.inspectionDays),
    onExpiry: draft.onExpiry,
  },
  status: draft.retired ? "retired" : "active",
})

function RuleEditor({
  rule,
  onSaved,
}: Readonly<{ rule?: ReturnPolicyRule; onSaved: () => Promise<unknown> }>) {
  const [draft, setDraft] = useState(() => ruleDraftOf(rule))
  const set = (patch: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const id = rule?.id ?? "new-rule"
  const toggle = (resolution: ResolutionType, on: boolean) =>
    set({
      resolutions: on
        ? [...draft.resolutions, resolution]
        : draft.resolutions.filter((r) => r !== resolution),
    })
  return (
    <ReasonDialog
      trigger={rule ? "Edit" : "Add a rule"}
      triggerVariant={rule ? "outline" : "default"}
      triggerLabel={rule ? `Edit ${rule.name}` : undefined}
      title={rule ? `Edit “${rule.name}”` : "Add a return rule"}
      description="Applies to requests opened from now on; open cases keep the policy they started under."
      confirmLabel="Save"
      noteRequired
      validate={() => (draft.name.trim().length < 2 ? "Name the rule." : null)}
      onConfirm={async (reason, note) => {
        const body = { ...ruleBodyOf(draft), reason, note }
        if (rule) await api.put(`/admin/return-policy/rules/${rule.id}`, body)
        else await api.post("/admin/return-policy/rules", body)
        await onSaved()
        if (!rule) setDraft(ruleDraftOf())
        toast.success("Rule saved")
      }}
      fields={
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input
              id={`${id}-name`}
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-outcome`}>Outcome</Label>
            <NativeSelect
              id={`${id}-outcome`}
              value={draft.outcome}
              onChange={(e) => set({ outcome: e.target.value as ReturnOutcome })}
            >
              {RETURN_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {RETURN_OUTCOME_LABELS[o]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-country`}>Country (code, optional)</Label>
            <Input
              id={`${id}-country`}
              value={draft.country}
              onChange={(e) => set({ country: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-category`}>Category id (optional)</Label>
            <Input
              id={`${id}-category`}
              value={draft.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-seller-type`}>Seller type</Label>
            <NativeSelect
              id={`${id}-seller-type`}
              value={draft.sellerType}
              onChange={(e) =>
                set({ sellerType: e.target.value as RuleDraft["sellerType"] })
              }
            >
              <option value="">Any</option>
              <option value="individual">Private sellers</option>
              <option value="business">Business sellers</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-max`}>Refund without return up to (blank = any)</Label>
            <Input
              id={`${id}-max`}
              type="number"
              min={0}
              value={draft.maxRefundWithoutReturn}
              onChange={(e) => set({ maxRefundWithoutReturn: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-method`}>How returns travel</Label>
            <NativeSelect
              id={`${id}-method`}
              value={draft.method}
              onChange={(e) => set({ method: e.target.value as ReturnMethod })}
            >
              {RETURN_METHODS.map((m) => (
                <option key={m} value={m}>
                  {RETURN_METHOD_LABELS[m]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-ship-by`}>Days to send it back</Label>
            <Input
              id={`${id}-ship-by`}
              type="number"
              min={1}
              value={draft.shipByDays}
              onChange={(e) => set({ shipByDays: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-inspect`}>
              Days to inspect (blank = refund on receipt)
            </Label>
            <Input
              id={`${id}-inspect`}
              type="number"
              min={1}
              value={draft.inspectionDays}
              onChange={(e) => set({ inspectionDays: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-expiry`}>Not sent back in time</Label>
            <NativeSelect
              id={`${id}-expiry`}
              value={draft.onExpiry}
              onChange={(e) =>
                set({ onExpiry: e.target.value as ReturnLogistics["onExpiry"] })
              }
            >
              <option value="escalate">Marketbase decides</option>
              <option value="close_without_refund">Close without a refund</option>
            </NativeSelect>
          </div>
          {draft.outcome !== "non_returnable" && (
            <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
              <legend className="mb-1 font-medium">Buyers may ask for</legend>
              {RESOLUTION_TYPES.map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.resolutions.includes(r)}
                    onChange={(e) => toggle(r, e.target.checked)}
                  />
                  {RESOLUTION_LABELS[r]}
                </label>
              ))}
            </fieldset>
          )}
          {rule && (
            <label className="flex items-center gap-2 text-sm">
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

/** Admin › Settings › Returns (FRD-07 ELG-001..010, FRD-02 CFG-037). */
export function ReturnsScreen() {
  usePageTitle("Returns")
  const queryClient = useQueryClient()
  const policy = useQuery({
    queryKey: keys.all,
    queryFn: ({ signal }) =>
      api.get<ReturnPolicyView>("/admin/return-policy", { signal }),
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
      <div className="flex flex-col gap-1">
        <Heading>Returns</Heading>
        <Text variant="muted">
          What buyers may ask for after delivery. The most specific rule wins; with none,
          every item can be refunded or sent back.
        </Text>
      </div>
      {policy.error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(policy.error, "Couldn't load the return policy.")}
        </Text>
      )}
      {policy.isPending && <Skeleton className="h-32" />}
      {policy.data && (
        <>
          <section aria-labelledby="reasons-heading" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Heading as="h2" size="h3" id="reasons-heading">
                Reasons
              </Heading>
              <ReasonsEditor
                key={JSON.stringify(policy.data.reasons)}
                reasons={policy.data.reasons}
                onSaved={refresh}
              />
            </div>
            <ul
              className="flex flex-col divide-y rounded-xl border text-sm"
              aria-label="Reasons"
            >
              {policy.data.reasons.map((r) => (
                <li key={r.code} className="flex flex-wrap items-center gap-2 p-3">
                  <span className="flex-1 font-medium">{r.label}</span>
                  {!r.active && <Badge variant="outline">Off</Badge>}
                  <span className="text-muted-foreground text-xs">
                    {r.minPhotos > 0 ? `${r.minPhotos} photo(s) · ` : ""}
                    {PAYER_LABELS[r.returnShippingPayer]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="rules-heading" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Heading as="h2" size="h3" id="rules-heading">
                Rules
              </Heading>
              <RuleEditor onSaved={refresh} />
            </div>
            {policy.data.rules.length === 0 ? (
              <Text variant="muted">No rules — the default applies everywhere.</Text>
            ) : (
              <ul
                className="flex flex-col divide-y rounded-xl border text-sm"
                aria-label="Rules"
              >
                {policy.data.rules.map((rule) => (
                  <li key={rule.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {rule.name}
                        <Badge variant="outline">
                          {RETURN_OUTCOME_LABELS[rule.outcome]}
                        </Badge>
                        {rule.status === "retired" && (
                          <Badge variant="outline">Retired</Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">
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
          </section>
        </>
      )}
    </PageContainer>
  )
}
