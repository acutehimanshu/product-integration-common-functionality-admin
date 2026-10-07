import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import type { CountryProfile } from "@acutehimanshu/core/domain/country-profile"
import {
  RULE_INFO,
  RULE_KEYS,
  RULE_STATUS_LABELS,
  ruleProblem,
  type AdminRules,
  type RuleInput,
  type RuleKey,
  type RulePreview,
  type RuleScope,
} from "@acutehimanshu/core/domain/rules"
import type { SellerType } from "@acutehimanshu/core/domain/seller"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

export const rulesKey = ["admin", "rules"] as const

type ScopeForm = {
  country: string
  categoryId: string
  sellerType: string
  sellerId: string
}
const EMPTY_SCOPE: ScopeForm = {
  country: "",
  categoryId: "",
  sellerType: "",
  sellerId: "",
}

/** The form's scope fields → a RuleScope (empty = any). */
export function toScope(form: ScopeForm): RuleScope {
  return {
    country: form.country || null,
    categoryId: form.categoryId || null,
    sellerType: (form.sellerType || null) as SellerType | null,
    sellerId: form.sellerId.trim() || null,
  }
}

/** A datetime-local value ("2026-10-20T09:00") → ISO, or undefined for "now". */
export function startOf(local: string): string | undefined {
  return local ? new Date(local).toISOString() : undefined
}

function ScopeFields({
  idPrefix,
  scope,
  onChange,
  countries,
  categories,
}: {
  idPrefix: string
  scope: ScopeForm
  onChange: (scope: ScopeForm) => void
  countries: CountryProfile[]
  categories: AdminCategory[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-country`}>Country</Label>
        <NativeSelect
          id={`${idPrefix}-country`}
          value={scope.country}
          onChange={(e) => onChange({ ...scope, country: e.target.value })}
        >
          <option value="">Any</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <NativeSelect
          id={`${idPrefix}-category`}
          value={scope.categoryId}
          onChange={(e) => onChange({ ...scope, categoryId: e.target.value })}
        >
          <option value="">Any</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-type`}>Seller type</Label>
        <NativeSelect
          id={`${idPrefix}-type`}
          value={scope.sellerType}
          onChange={(e) => onChange({ ...scope, sellerType: e.target.value })}
        >
          <option value="">Any</option>
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-seller`}>Seller ID</Label>
        <Input
          id={`${idPrefix}-seller`}
          value={scope.sellerId}
          placeholder="Any"
          onChange={(e) => onChange({ ...scope, sellerId: e.target.value })}
        />
      </div>
    </div>
  )
}

function AddRule({
  countries,
  categories,
}: {
  countries: CountryProfile[]
  categories: AdminCategory[]
}) {
  const queryClient = useQueryClient()
  const [key, setKey] = useState<RuleKey>("problemWindowDays")
  const [value, setValue] = useState("")
  const [scope, setScope] = useState<ScopeForm>(EMPTY_SCOPE)
  const [start, setStart] = useState("")
  const info = RULE_INFO[key]
  const input = (): RuleInput => ({
    key,
    value: Number(value),
    scope: toScope(scope),
    effectiveFrom: startOf(start),
  })
  return (
    <section
      aria-labelledby="add-rule"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="add-rule">
        Add a rule
      </Heading>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-key">What it changes</Label>
          <NativeSelect
            id="rule-key"
            value={key}
            onChange={(e) => setKey(e.target.value as RuleKey)}
            aria-describedby="rule-key-about"
          >
            {RULE_KEYS.map((k) => (
              <option key={k} value={k}>
                {RULE_INFO[k].label}
              </option>
            ))}
          </NativeSelect>
          <p id="rule-key-about" className="text-muted-foreground text-xs">
            {info.about}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-value">Value ({info.unit})</Label>
          <Input
            id="rule-value"
            type="number"
            min={info.min}
            max={info.max}
            step={key === "platformFeePercent" ? "0.1" : "1"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-start">Starts</Label>
          <Input
            id="rule-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-describedby="rule-start-hint"
          />
          <p id="rule-start-hint" className="text-muted-foreground text-xs">
            Empty = now. Never in the past.
          </p>
        </div>
      </div>
      <Text className="text-sm font-medium">Applies to</Text>
      <ScopeFields
        idPrefix="rule"
        scope={scope}
        onChange={setScope}
        countries={countries}
        categories={categories}
      />
      <div>
        <ReasonDialog
          trigger="Add rule"
          triggerVariant="default"
          title={`Add a rule: ${info.label}?`}
          description="New orders, offers and requests use it from its start. Orders already placed keep their own rules."
          confirmLabel="Add rule"
          noteRequired
          validate={() => (value.trim() === "" ? "Enter a value." : ruleProblem(input()))}
          onConfirm={async (reason, note = "") => {
            const updated = await api.post<AdminRules>("/admin/rules", {
              ...input(),
              reason,
              note,
            })
            queryClient.setQueryData(rulesKey, updated)
            setValue("")
            setStart("")
            setScope(EMPTY_SCOPE)
            toast.success("Rule added")
          }}
        />
      </div>
    </section>
  )
}

function Preview({
  countries,
  categories,
}: {
  countries: CountryProfile[]
  categories: AdminCategory[]
}) {
  const [scope, setScope] = useState<ScopeForm>(EMPTY_SCOPE)
  const [at, setAt] = useState("")
  const [asked, setAsked] = useState<string | null>(null)
  const { data, error, isFetching } = useQuery({
    queryKey: [...rulesKey, "preview", asked],
    enabled: asked !== null,
    queryFn: ({ signal }) =>
      api.get<RulePreview>(`/admin/rules/preview?${asked}`, { signal }),
  })
  const ask = () => {
    const s = toScope(scope)
    const params = new URLSearchParams()
    if (s.country) params.set("country", s.country)
    if (s.categoryId) params.set("categoryId", s.categoryId)
    if (s.sellerType) params.set("sellerType", s.sellerType)
    if (s.sellerId) params.set("sellerId", s.sellerId)
    const when = startOf(at)
    if (when) params.set("at", when)
    setAsked(params.toString())
  }
  return (
    <section
      aria-labelledby="rule-preview"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="rule-preview">
        Which rule applies?
      </Heading>
      <Text variant="muted" className="text-sm">
        Pick a situation to see every value it gets and where it comes from.
      </Text>
      <ScopeFields
        idPrefix="preview"
        scope={scope}
        onChange={setScope}
        countries={countries}
        categories={categories}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preview-at">On</Label>
          <Input
            id="preview-at"
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={ask} disabled={isFetching}>
          Show values
        </Button>
      </div>
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't work it out.")}
        </Text>
      )}
      {data && (
        <table className="w-full text-left text-sm" aria-label="Values that apply">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 pr-3 font-medium">
                Setting
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Value
              </th>
              <th scope="col" className="py-1 font-medium">
                From
              </th>
            </tr>
          </thead>
          <tbody>
            {RULE_KEYS.map((k) => (
              <tr key={k} className="border-t">
                <th scope="row" className="py-1 pr-3 font-normal">
                  {RULE_INFO[k].label}
                </th>
                <td className="py-1 pr-3">
                  {data[k].value} {RULE_INFO[k].unit}
                </td>
                <td className="py-1">{data[k].source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/** Settings › Rules: global values changed per country, category, seller type or seller, from a date. */
export function RulesScreen() {
  usePageTitle("Rules")
  const queryClient = useQueryClient()
  const rules = useQuery({
    queryKey: rulesKey,
    queryFn: ({ signal }) => api.get<AdminRules>("/admin/rules", { signal }),
  })
  const countries = useQuery({
    queryKey: ["admin", "countries"],
    queryFn: ({ signal }) => api.get<CountryProfile[]>("/admin/countries", { signal }),
  })
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const error = rules.error ?? countries.error ?? categories.error
  return (
    <PageContainer maxWidth="6xl">
      <Link to="/settings" className="text-muted-foreground text-sm hover:underline">
        ← Marketplace settings
      </Link>
      <div className="flex flex-col gap-1">
        <Heading>Rules</Heading>
        <Text variant="muted">
          Marketplace settings are the global values. A rule changes one for a country,
          category, seller type or seller — the most specific rule in force wins (seller,
          then seller type, then category, then country). Rules start now or on a date and
          are never backdated; orders keep the values they were placed under.
        </Text>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load rules.")}
        </Text>
      ) : !rules.data || !countries.data || !categories.data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <AddRule countries={countries.data} categories={categories.data} />
          <section aria-labelledby="rule-list" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="rule-list">
              All rules
            </Heading>
            {rules.data.rules.length === 0 ? (
              <Text variant="muted">
                No rules yet — the global values apply everywhere.
              </Text>
            ) : (
              <ul
                className="flex flex-col divide-y rounded-xl border text-sm"
                aria-label="Rules"
              >
                {rules.data.rules.map((rule) => {
                  const info = RULE_INFO[rule.key]
                  const label = `${info.label} for ${rule.scopeLabel}`
                  return (
                    <li key={rule.id} className="flex flex-wrap items-center gap-3 p-3">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-medium">
                          {info.label}: {rule.value} {info.unit}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {rule.scopeLabel} · from {formatDateTime(rule.effectiveFrom)}
                          {rule.endedAt &&
                            ` · ended ${formatDateTime(rule.endedAt)}`} ·{" "}
                          {rule.createdBy.name}: “{rule.reason}”
                        </span>
                      </span>
                      <Badge variant={rule.status === "in_force" ? "default" : "outline"}>
                        {RULE_STATUS_LABELS[rule.status]}
                      </Badge>
                      {rule.status !== "ended" && (
                        <ReasonDialog
                          trigger={rule.status === "scheduled" ? "Cancel" : "End"}
                          triggerLabel={`${rule.status === "scheduled" ? "Cancel" : "End"} ${label}`}
                          title={`${rule.status === "scheduled" ? "Cancel" : "End"} this rule?`}
                          description="The next most specific rule (or the global value) applies instead. Orders already placed keep theirs."
                          confirmLabel={
                            rule.status === "scheduled" ? "Cancel rule" : "End rule"
                          }
                          noteRequired
                          onConfirm={async (reason, note = "") => {
                            queryClient.setQueryData(
                              rulesKey,
                              await api.post<AdminRules>(`/admin/rules/${rule.id}/end`, {
                                reason,
                                note,
                              })
                            )
                            toast.success("Rule ended")
                          }}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          <Preview countries={countries.data} categories={categories.data} />
          <AuditHistory entries={rules.data.history} />
        </>
      )}
    </PageContainer>
  )
}
