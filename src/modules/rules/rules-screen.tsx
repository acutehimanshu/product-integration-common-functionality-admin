import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Category } from "@acutehimanshu/core/domain/categories"
import {
  RULE_INFO,
  RULE_KEYS,
  RULE_STATUS_LABELS,
  ruleProblem,
  type AdminRule,
  type AdminRules,
  type RuleInput,
  type RuleKey,
  type RulePreview,
  type RuleScope,
  type RuleStatus,
  type UpcomingChange,
} from "@acutehimanshu/core/domain/rules"
import type { SellerType } from "@acutehimanshu/core/domain/seller"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
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
import { useAdmin } from "@/lib/auth"
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

type Lists = { countries: SupportedCountry[]; categories: Category[] }

function ScopeFields({
  idPrefix,
  scope,
  onChange,
  countries,
  categories,
}: Readonly<
  Lists & { idPrefix: string; scope: ScopeForm; onChange: (scope: ScopeForm) => void }
>) {
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

function savedMessage(draft: boolean, status: RuleStatus | undefined): string {
  if (draft) return "Saved as a draft"
  return status === "pending_approval"
    ? "Sent for another admin's approval"
    : "Rule added"
}

function AddRule({ countries, categories }: Readonly<Lists>) {
  const queryClient = useQueryClient()
  const [key, setKey] = useState<RuleKey>("problemWindowDays")
  const [value, setValue] = useState("")
  const [scope, setScope] = useState<ScopeForm>(EMPTY_SCOPE)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [priority, setPriority] = useState("0")
  const info = RULE_INFO[key]
  const input = (): RuleInput => ({
    key,
    value: Number(value),
    scope: toScope(scope),
    priority: Number(priority) || 0,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  })
  const save = async (reason: string, note: string, draft: boolean) => {
    const updated = await api.post<AdminRules>("/admin/rules", {
      ...input(),
      draft,
      reason,
      note,
    })
    queryClient.setQueryData(rulesKey, updated)
    const status = updated.rules.find((r) => r.reason === reason)?.status
    setValue("")
    setStartDate("")
    setEndDate("")
    setScope(EMPTY_SCOPE)
    toast.success(savedMessage(draft, status))
  }
  const validate = () => (value.trim() === "" ? "Enter a value." : ruleProblem(input()))
  return (
    <section
      aria-labelledby="add-rule"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="add-rule">
        Add a rule
      </Heading>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
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
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-describedby="rule-dates-hint"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-end">Ends (optional)</Label>
          <Input
            id="rule-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-describedby="rule-dates-hint"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-priority">Priority</Label>
          <Input
            id="rule-priority"
            type="number"
            min={0}
            max={100}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-describedby="rule-priority-hint"
          />
        </div>
      </div>
      <p id="rule-dates-hint" className="text-muted-foreground text-xs">
        Dates begin at midnight in the rule&apos;s country (Sydney time for any country).
        Empty start = now; never in the past.
      </p>
      <p id="rule-priority-hint" className="text-muted-foreground text-xs">
        Priority breaks a tie between two rules for exactly the same scope (higher wins);
        two rules on exactly the same terms are refused.
      </p>
      <Text className="text-sm font-medium">Applies to</Text>
      <ScopeFields
        idPrefix="rule"
        scope={scope}
        onChange={setScope}
        countries={countries}
        categories={categories}
      />
      <div className="flex flex-wrap gap-2">
        <ReasonDialog
          trigger="Add rule"
          triggerVariant="default"
          title={`Add a rule: ${info.label}?`}
          description="New orders, offers and requests use it from its start (once approved, if approval is on). Orders already placed keep their own rules."
          confirmLabel="Add rule"
          noteRequired
          validate={validate}
          onConfirm={(reason, note = "") => save(reason, note, false)}
        />
        <ReasonDialog
          trigger="Save as draft"
          title="Save this rule as a draft?"
          description="A draft never applies. Submit it later from the list."
          confirmLabel="Save draft"
          noteRequired
          validate={validate}
          onConfirm={(reason, note = "") => save(reason, note, true)}
        />
      </div>
    </section>
  )
}

/** One lifecycle button on a rule row. */
function RuleAction({
  rule,
  action,
  trigger,
  description,
  done,
  destructive = false,
}: Readonly<{
  rule: AdminRule
  action: "submit" | "approve" | "reject" | "disable" | "enable" | "end"
  trigger: string
  description: string
  done: string
  destructive?: boolean
}>) {
  const queryClient = useQueryClient()
  const info = RULE_INFO[rule.key]
  return (
    <ReasonDialog
      trigger={trigger}
      triggerVariant={destructive ? "destructive" : "outline"}
      triggerLabel={`${trigger} ${info.label} for ${rule.scopeLabel}`}
      title={`${trigger}: ${info.label} for ${rule.scopeLabel}?`}
      description={description}
      confirmLabel={action === "reject" ? trigger : `${trigger} rule`}
      destructive={destructive}
      noteRequired={action !== "reject"}
      onConfirm={async (reason, note = "") => {
        queryClient.setQueryData(
          rulesKey,
          await api.post<AdminRules>(`/admin/rules/${rule.id}/${action}`, {
            reason,
            note,
          })
        )
        await queryClient.invalidateQueries({ queryKey: [...rulesKey, "upcoming"] })
        toast.success(done)
      }}
    />
  )
}

const BADGE: Partial<Record<RuleStatus, "default" | "destructive">> = {
  in_force: "default",
  pending_approval: "destructive",
}

function RuleRow({
  rule,
  myId,
}: Readonly<{ rule: AdminRule; myId: string | undefined }>) {
  const info = RULE_INFO[rule.key]
  const ending = rule.status === "scheduled" ? "Cancel" : "End"
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">
          {info.label}: {rule.value} {info.unit}
          {rule.priority > 0 && ` · priority ${rule.priority}`}
        </span>
        <span className="text-muted-foreground text-xs">
          {rule.scopeLabel} · from {formatDateTime(rule.effectiveFrom)}
          {rule.endedAt && ` · until ${formatDateTime(rule.endedAt)}`} ·{" "}
          {rule.createdBy.name}: “{rule.reason}”
          {rule.approvedBy && ` · approved by ${rule.approvedBy.name}`}
        </span>
      </span>
      <Badge variant={BADGE[rule.status] ?? "outline"}>
        {RULE_STATUS_LABELS[rule.status]}
      </Badge>
      {rule.status === "draft" && (
        <RuleAction
          rule={rule}
          action="submit"
          trigger="Submit"
          description="It goes for approval if that's on, otherwise it applies from its start."
          done="Submitted"
        />
      )}
      {rule.status === "pending_approval" && rule.createdBy.id !== myId && (
        <>
          <RuleAction
            rule={rule}
            action="approve"
            trigger="Approve"
            description="It applies from its start (or now, if that has passed)."
            done="Approved"
          />
          <RuleAction
            rule={rule}
            action="reject"
            trigger="Send back"
            description="It goes back to a draft for its author."
            done="Sent back to draft"
          />
        </>
      )}
      {(rule.status === "in_force" ||
        rule.status === "scheduled" ||
        rule.status === "superseded") && (
        <RuleAction
          rule={rule}
          action="disable"
          trigger="Disable"
          description="Switched off until you enable it again; the next rule (or the global value) applies."
          done="Rule disabled"
        />
      )}
      {rule.status === "disabled" && (
        <RuleAction
          rule={rule}
          action="enable"
          trigger="Enable"
          description="It applies again by its dates."
          done="Rule enabled"
        />
      )}
      {rule.status !== "ended" && rule.status !== "draft" && (
        <RuleAction
          rule={rule}
          action="end"
          trigger={ending}
          description="The next most specific rule (or the global value) applies instead. Orders already placed keep theirs."
          done="Rule ended"
          destructive
        />
      )}
    </li>
  )
}

const STATUS_FILTERS: Array<RuleStatus | ""> = [
  "",
  "in_force",
  "scheduled",
  "pending_approval",
  "draft",
  "superseded",
  "disabled",
  "ended",
]

/** Filters (FRD-02 CFG-053) and the list. */
function RuleList({ countries }: Readonly<{ countries: SupportedCountry[] }>) {
  const { data: me } = useAdmin()
  const [filter, setFilter] = useState({ country: "", status: "", from: "", to: "" })
  const query = new URLSearchParams(
    Object.entries(filter).filter(([, value]) => value !== "")
  ).toString()
  const path = query ? "/admin/rules?" + query : "/admin/rules"
  const { data, error } = useQuery({
    queryKey: query ? [...rulesKey, query] : rulesKey,
    queryFn: ({ signal }) => api.get<AdminRules>(path, { signal }),
  })
  return (
    <section aria-labelledby="rule-list" className="flex flex-col gap-2">
      <Heading as="h2" size="h3" id="rule-list">
        All rules
      </Heading>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-country">Country</Label>
          <NativeSelect
            id="filter-country"
            value={filter.country}
            onChange={(e) => setFilter({ ...filter, country: e.target.value })}
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
          <Label htmlFor="filter-status">Status</Label>
          <NativeSelect
            id="filter-status"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status ? RULE_STATUS_LABELS[status] : "Any"}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">Starts from</Label>
          <Input
            id="filter-from"
            type="date"
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">Starts by</Label>
          <Input
            id="filter-to"
            type="date"
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          />
        </div>
      </div>
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load rules.")}
        </Text>
      )}
      {!data && <Skeleton className="h-32" />}
      {data?.rules.length === 0 && (
        <Text variant="muted">
          {query
            ? "No rules match."
            : "No rules yet — the global values apply everywhere."}
        </Text>
      )}
      {data && data.rules.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Rules"
        >
          {data.rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} myId={me?.id} />
          ))}
        </ul>
      )}
    </section>
  )
}

const CHANGE_LABELS: Record<UpcomingChange["kind"], string> = {
  awaiting_approval: "Waiting for approval",
  rule_starts: "Starts",
  rule_ends: "Ends",
}

/** What's about to change, across every country (FRD-02 CFG-059). */
function UpcomingChanges() {
  const { data } = useQuery({
    queryKey: [...rulesKey, "upcoming"],
    queryFn: ({ signal }) =>
      api.get<UpcomingChange[]>("/admin/upcoming-changes", { signal }),
  })
  return (
    <section aria-labelledby="upcoming" className="flex flex-col gap-2">
      <Heading as="h2" size="h3" id="upcoming">
        Upcoming changes
      </Heading>
      {!data && <Skeleton className="h-16" />}
      {data?.length === 0 && (
        <Text variant="muted">Nothing scheduled or waiting for approval.</Text>
      )}
      {data && data.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Upcoming changes"
        >
          {data.map((change) => {
            const info = RULE_INFO[change.rule.key]
            return (
              <li
                key={`${change.kind}-${change.rule.id}`}
                className="flex flex-wrap gap-3 p-3"
              >
                <span className="w-44 font-medium">
                  {CHANGE_LABELS[change.kind]}
                  {change.at && ` ${formatDateTime(change.at)}`}
                </span>
                <span>
                  {info.label}: {change.rule.value} {info.unit} · {change.rule.scopeLabel}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Preview({ countries, categories }: Readonly<Lists>) {
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

/** Rules: global values changed per country, category, seller type or seller, from a date. */
export function RulesScreen() {
  usePageTitle("Rules")
  const rules = useQuery({
    queryKey: rulesKey,
    queryFn: ({ signal }) => api.get<AdminRules>("/admin/rules", { signal }),
  })
  // Public lists: Rules access alone is enough to read them.
  const countries = useQuery({
    queryKey: ["reference", "countries"],
    queryFn: ({ signal }) => api.get<SupportedCountry[]>("/countries", { signal }),
  })
  const categories = useQuery({
    queryKey: ["reference", "categories"],
    queryFn: ({ signal }) => api.get<Category[]>("/categories", { signal }),
  })
  const error = rules.error ?? countries.error ?? categories.error
  return (
    <PageContainer maxWidth="6xl">
      <div className="flex flex-col gap-1">
        <Heading>Rules</Heading>
        <Text variant="muted">
          Marketplace settings are the global values. A rule changes one for a country,
          category, seller type or seller — the most specific rule in force wins (seller,
          then seller type, then category, then country; then the higher priority, then
          the newest start). Rules start now or on a date, are never backdated, and can be
          prepared as drafts; when approval is on, another admin publishes them. Orders
          keep the values they were placed under.
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
          <UpcomingChanges />
          <RuleList countries={countries.data} />
          <Preview countries={countries.data} categories={categories.data} />
          <AuditHistory entries={rules.data.history} />
        </>
      )}
    </PageContainer>
  )
}
