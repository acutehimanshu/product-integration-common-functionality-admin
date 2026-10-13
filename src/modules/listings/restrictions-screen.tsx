import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import {
  RESTRICTION_OUTCOMES,
  RESTRICTION_OUTCOME_LABELS,
  type RestrictionOutcome,
  type RestrictionRule,
} from "@acutehimanshu/core/domain/restrictions"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
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
import { ModerationTabs } from "@/modules/listings/moderation-tabs"

const keys = { all: ["admin", "restrictions"] as const }

type Draft = {
  country: string
  categoryId: string
  keywords: string
  outcome: RestrictionOutcome
  message: string
  retired: boolean
}

const draftOf = (rule?: RestrictionRule): Draft => ({
  country: rule?.country ?? "",
  categoryId: rule?.categoryId ?? "",
  keywords: (rule?.keywords ?? []).join(", "),
  outcome: rule?.outcome ?? "review",
  message: rule?.message ?? "",
  retired: rule?.status === "retired",
})

const bodyOf = (draft: Draft) => ({
  country: draft.country || null,
  categoryId: draft.categoryId || null,
  keywords: draft.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
  outcome: draft.outcome,
  message: draft.message.trim(),
  status: draft.retired ? "retired" : "active",
})

function RuleEditor({
  rule,
  categories,
  countries,
  onSaved,
}: Readonly<{
  rule?: RestrictionRule
  categories: AdminCategory[]
  countries: SupportedCountry[]
  onSaved: () => Promise<unknown>
}>) {
  const [draft, setDraft] = useState(() => draftOf(rule))
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const id = rule?.id ?? "new"
  return (
    <ReasonDialog
      trigger={rule ? "Edit" : "Add a restriction"}
      triggerVariant={rule ? "outline" : "default"}
      triggerLabel={rule ? `Edit ${rule.message}` : undefined}
      title={rule ? "Edit the restriction" : "Add a restriction"}
      description="Saving a change asks for a new review of listings approved under the old one."
      confirmLabel="Save"
      noteRequired
      validate={() => (draft.message.trim().length < 5 ? "Tell sellers why." : null)}
      onConfirm={async (reason, note) => {
        const body = { ...bodyOf(draft), reason, note }
        if (rule) await api.put(`/admin/restrictions/${rule.id}`, body)
        else await api.post("/admin/restrictions", body)
        await onSaved()
        if (!rule) setDraft(draftOf())
        toast.success("Restriction saved")
      }}
      fields={
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-country`}>Country</Label>
              <NativeSelect
                id={`${id}-country`}
                value={draft.country}
                onChange={(e) => set({ country: e.target.value })}
              >
                <option value="">Every country</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-category`}>Category</Label>
              <NativeSelect
                id={`${id}-category`}
                value={draft.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
              >
                <option value="">Every category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.path.join(" › ")}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-keywords`}>Title words (optional)</Label>
            <Input
              id={`${id}-keywords`}
              value={draft.keywords}
              placeholder="sword, machete"
              onChange={(e) => set({ keywords: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-outcome`}>Outcome</Label>
            <NativeSelect
              id={`${id}-outcome`}
              value={draft.outcome}
              onChange={(e) => set({ outcome: e.target.value as RestrictionOutcome })}
            >
              {RESTRICTION_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {RESTRICTION_OUTCOME_LABELS[o]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-note`}>What sellers are told</Label>
            <Input
              id={`${id}-note`}
              value={draft.message}
              onChange={(e) => set({ message: e.target.value })}
            />
          </div>
          {rule && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.retired}
                onChange={(e) => set({ retired: e.target.checked })}
              />
              Retired (no longer applies)
            </label>
          )}
        </div>
      }
    />
  )
}

/**
 * Restricted items (FRD-04 CAT-025, FRD-02 CFG-032): what may be sold
 * where. The most specific rule wins; nothing matching is allowed.
 */
export function RestrictionsScreen() {
  usePageTitle("Restricted items")
  const queryClient = useQueryClient()
  const rules = useQuery({
    queryKey: keys.all,
    queryFn: ({ signal }) =>
      api.get<RestrictionRule[]>("/admin/restrictions", { signal }),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const { data: countries = [] } = useQuery({
    queryKey: ["admin", "countries", "list"],
    queryFn: ({ signal }) => api.get<SupportedCountry[]>("/admin/countries", { signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.all })
  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.path.join(" › ") ?? id) : "Every category"

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading>Listing moderation</Heading>
          <Text variant="muted">
            Allowed, Manual review or Prohibited, by country and category. The most
            specific rule wins.
          </Text>
        </div>
        <RuleEditor categories={categories} countries={countries} onSaved={refresh} />
      </div>
      <ModerationTabs />
      {rules.error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(rules.error, "Couldn't load restrictions.")}
        </Text>
      )}
      {rules.isPending && <Skeleton className="h-48" />}
      {rules.data && (
        <ul
          className="flex flex-col divide-y rounded-xl border"
          aria-label="Restrictions"
        >
          {rules.data.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {rule.message}
                  <Badge
                    variant={rule.outcome === "prohibited" ? "destructive" : "secondary"}
                  >
                    {RESTRICTION_OUTCOME_LABELS[rule.outcome]}
                  </Badge>
                  {rule.status === "retired" && <Badge variant="outline">Retired</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {rule.country ?? "Every country"} · {categoryName(rule.categoryId)}
                  {rule.keywords.length ? ` · title has ${rule.keywords.join(", ")}` : ""}
                  {` · version ${rule.version}`}
                </span>
              </div>
              <RuleEditor
                rule={rule}
                categories={categories}
                countries={countries}
                onSaved={refresh}
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
