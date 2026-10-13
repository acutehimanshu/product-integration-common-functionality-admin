import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes } from "react-router"
import { toast } from "sonner"
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  MARKETING_EMAIL_STATUS_LABELS,
  MARKETING_SERVICE_KINDS,
  MARKETING_SERVICE_KIND_LABELS,
  PLACEMENTS,
  PLACEMENT_IDS,
  SERVICE_REQUEST_NEXT,
  SERVICE_REQUEST_STATUS_LABELS,
  SUPPRESSION_REASON_LABELS,
  type Campaign,
  type CampaignObjective,
  type MarketingEmail,
  type MarketingService,
  type MarketingServiceKind,
  type PlacementConflict,
  type PlacementId,
  type ServiceRequest,
  type ServiceRequestStatus,
  type Suppression,
} from "@acutehimanshu/core/domain/marketing"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { ReasonDialog } from "@/components/reason-dialog"
import { SubNav } from "@/components/sub-nav"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

// Admin › Content › Marketing (FRD-09 MKT-001..020): service requests,
// campaigns and placements, marketing email and the suppression list.

const base = ["admin", "marketing"] as const
const keys = {
  requests: [...base, "requests"] as const,
  campaigns: [...base, "campaigns"] as const,
  emails: [...base, "emails"] as const,
  services: [...base, "services"] as const,
  suppressions: [...base, "suppressions"] as const,
}

function useList<T>(key: readonly string[], path: string) {
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<T[]>(path, { signal }),
  })
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: base })
}

function Loading({ error, pending }: Readonly<{ error: unknown; pending: boolean }>) {
  if (error)
    return (
      <Text role="alert" className="text-destructive">
        {getErrorMessage(error, "Couldn't load this.")}
      </Text>
    )
  return pending ? <Skeleton className="h-32" /> : null
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

const list = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
const iso = (local: string) => (local ? new Date(local).toISOString() : undefined)

// ---------- Requests ----------

function RequestRow({ request }: Readonly<{ request: ServiceRequest }>) {
  const refresh = useRefresh()
  const [note, setNote] = useState("")
  const move = (status: ServiceRequestStatus) => (
    <ReasonDialog
      key={status}
      trigger={SERVICE_REQUEST_STATUS_LABELS[status]}
      triggerLabel={`${SERVICE_REQUEST_STATUS_LABELS[status]}: ${request.serviceName} for ${request.shopName}`}
      title={`${SERVICE_REQUEST_STATUS_LABELS[status]}?`}
      description="The seller sees the status and your note. Declining or cancelling gives their credits back."
      confirmLabel={SERVICE_REQUEST_STATUS_LABELS[status]}
      fields={
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`note-${request.id}-${status}`}>
            Note to the seller (optional)
          </Label>
          <Textarea
            id={`note-${request.id}-${status}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      }
      onConfirm={async (reason) => {
        await api.post(`/admin/marketing/requests/${request.id}/status`, {
          status,
          reason,
          note: note.trim() || undefined,
        })
        await refresh()
      }}
    />
  )
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">
          {request.serviceName} — {request.shopName}
          {request.listingTitle && ` · ${request.listingTitle}`}
        </span>
        <Badge variant="outline">{request.country}</Badge>
        <Badge variant="outline">{SERVICE_REQUEST_STATUS_LABELS[request.status]}</Badge>
        {request.campaignId && (
          <Link to={`../campaigns#${request.campaignId}`} className="text-xs underline">
            Campaign
          </Link>
        )}
      </div>
      {request.message && <Text variant="muted">“{request.message}”</Text>}
      <ol className="text-muted-foreground flex flex-col gap-0.5 text-xs">
        {request.history.map((h) => (
          <li key={`${h.at}-${h.status}`}>
            {formatDateTime(h.at)} — {SERVICE_REQUEST_STATUS_LABELS[h.status]} by {h.by}
            {h.note && `: ${h.note}`}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {SERVICE_REQUEST_NEXT[request.status].map(move)}
      </div>
    </li>
  )
}

function Requests() {
  usePageTitle("Marketing requests")
  const { data, isPending, error } = useList<ServiceRequest>(
    keys.requests,
    "/admin/marketing/requests"
  )
  return (
    <>
      <Loading error={error} pending={isPending} />
      {data?.length === 0 && <Text variant="muted">No requests yet.</Text>}
      <ul
        className="flex flex-col divide-y rounded-xl border text-sm"
        aria-label="Requests"
      >
        {data?.map((r) => (
          <RequestRow key={r.id} request={r} />
        ))}
      </ul>
    </>
  )
}

// ---------- Campaigns ----------

type CampaignForm = {
  name: string
  objective: CampaignObjective
  country: string
  startsAt: string
  endsAt: string
  placements: PlacementId[]
  listingIds: string
  sellerIds: string
  categoryIds: string
}
const emptyCampaign: CampaignForm = {
  name: "",
  objective: "sales",
  country: "AU",
  startsAt: "",
  endsAt: "",
  placements: ["home_promoted"],
  listingIds: "",
  sellerIds: "",
  categoryIds: "",
}

function NewCampaign() {
  const refresh = useRefresh()
  const [form, setForm] = useState(emptyCampaign)
  const set = (patch: Partial<CampaignForm>) => setForm((f) => ({ ...f, ...patch }))
  return (
    <ReasonDialog
      trigger="New campaign"
      triggerVariant="default"
      title="New campaign"
      description="Saved as a draft; launching checks the placements have room."
      confirmLabel="Save draft"
      validate={() =>
        form.name.trim() && form.startsAt && form.endsAt ? null : "Add a name and dates."
      }
      fields={
        <div className="grid gap-2 sm:grid-cols-2">
          <Field
            id="cmp-name"
            label="Name"
            value={form.name}
            onChange={(v) => set({ name: v })}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cmp-objective">Objective</Label>
            <NativeSelect
              id="cmp-objective"
              value={form.objective}
              onChange={(e) => set({ objective: e.target.value as CampaignObjective })}
            >
              {CAMPAIGN_OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {CAMPAIGN_OBJECTIVE_LABELS[o]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Field
            id="cmp-country"
            label="Country"
            value={form.country}
            onChange={(v) => set({ country: v.toUpperCase() })}
          />
          <Field
            id="cmp-start"
            label="Starts"
            type="datetime-local"
            value={form.startsAt}
            onChange={(v) => set({ startsAt: v })}
          />
          <Field
            id="cmp-end"
            label="Ends"
            type="datetime-local"
            value={form.endsAt}
            onChange={(v) => set({ endsAt: v })}
          />
          <fieldset className="flex flex-col gap-1 sm:col-span-2">
            <legend className="text-sm font-medium">Placements</legend>
            {PLACEMENT_IDS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.placements.includes(p)}
                  onChange={(e) =>
                    set({
                      placements: e.target.checked
                        ? [...form.placements, p]
                        : form.placements.filter((x) => x !== p),
                    })
                  }
                />
                {PLACEMENTS[p].label} ({PLACEMENTS[p].slots} slots)
              </label>
            ))}
          </fieldset>
          <Field
            id="cmp-listings"
            label="Listing ids (comma-separated)"
            value={form.listingIds}
            onChange={(v) => set({ listingIds: v })}
          />
          <Field
            id="cmp-sellers"
            label="Shop (seller) ids"
            value={form.sellerIds}
            onChange={(v) => set({ sellerIds: v })}
          />
          <Field
            id="cmp-categories"
            label="Category ids (category placement)"
            value={form.categoryIds}
            onChange={(v) => set({ categoryIds: v })}
          />
        </div>
      }
      onConfirm={async (reason) => {
        await api.post("/admin/marketing/campaigns", {
          name: form.name.trim(),
          objective: form.objective,
          country: form.country,
          startsAt: iso(form.startsAt),
          endsAt: iso(form.endsAt),
          placements: form.placements,
          targeting: {
            listingIds: list(form.listingIds),
            sellerIds: list(form.sellerIds),
            categoryIds: list(form.categoryIds),
          },
          reason,
        })
        setForm(emptyCampaign)
        await refresh()
      }}
    />
  )
}

type CampaignRowData = Campaign & { conflicts: PlacementConflict[] }

const CAMPAIGN_ACTIONS: Array<{
  action: string
  label: string
  when: Campaign["status"][]
}> = [
  { action: "launch", label: "Launch", when: ["draft"] },
  { action: "pause", label: "Pause", when: ["scheduled", "active"] },
  { action: "resume", label: "Resume", when: ["paused"] },
  { action: "end", label: "End now", when: ["draft", "scheduled", "active", "paused"] },
]

function CampaignRow({ campaign }: Readonly<{ campaign: CampaignRowData }>) {
  const refresh = useRefresh()
  return (
    <li id={campaign.id} className="flex flex-col gap-1 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">{campaign.name}</span>
        <Badge variant="outline">{campaign.country}</Badge>
        <Badge variant="outline">{CAMPAIGN_OBJECTIVE_LABELS[campaign.objective]}</Badge>
        <Badge variant={campaign.status === "active" ? "default" : "outline"}>
          {CAMPAIGN_STATUS_LABELS[campaign.status]}
        </Badge>
      </div>
      <Text variant="muted">
        {formatDateTime(campaign.startsAt)} – {formatDateTime(campaign.endsAt)} ·{" "}
        {campaign.placements.map((p) => PLACEMENTS[p].label).join(", ")} ·{" "}
        {campaign.stats.impressions} shown, {campaign.stats.clicks} clicks · targeting
        version {campaign.targetingVersions.length} · owner {campaign.owner.name}
        {campaign.pausedReason && ` · paused: ${campaign.pausedReason}`}
      </Text>
      {campaign.conflicts.length > 0 && (
        <Text role="note" className="text-destructive text-sm">
          Placement full in this window:{" "}
          {campaign.conflicts
            .map((c) => `${PLACEMENTS[c.placementId].label} (${c.slots} slots)`)
            .join(", ")}
        </Text>
      )}
      <div className="flex flex-wrap gap-2">
        {CAMPAIGN_ACTIONS.filter((a) => a.when.includes(campaign.status)).map((a) => (
          <ReasonDialog
            key={a.action}
            trigger={a.label}
            triggerLabel={`${a.label} ${campaign.name}`}
            title={`${a.label}: ${campaign.name}?`}
            description="Recorded with your reason."
            confirmLabel={a.label}
            onConfirm={async (reason) => {
              try {
                await api.post(`/admin/marketing/campaigns/${campaign.id}/${a.action}`, {
                  reason,
                })
              } finally {
                await refresh()
              }
            }}
          />
        ))}
      </div>
    </li>
  )
}

function Campaigns() {
  usePageTitle("Campaigns")
  const { data, isPending, error } = useList<CampaignRowData>(
    keys.campaigns,
    "/admin/marketing/campaigns"
  )
  return (
    <>
      <div>
        <NewCampaign />
      </div>
      <Loading error={error} pending={isPending} />
      <ul
        className="flex flex-col divide-y rounded-xl border text-sm"
        aria-label="Campaigns"
      >
        {data?.map((c) => (
          <CampaignRow key={c.id} campaign={c} />
        ))}
      </ul>
    </>
  )
}

// ---------- Email ----------

function NewEmail() {
  const refresh = useRefresh()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [country, setCountry] = useState("AU")
  const [who, setWho] = useState<"everyone" | "buyers" | "sellers">("everyone")
  return (
    <ReasonDialog
      trigger="New email"
      triggerVariant="default"
      title="New marketing email"
      description="Plain text. Only people who said yes to offers get it, and every email has an unsubscribe link."
      confirmLabel="Save draft"
      fields={
        <div className="flex flex-col gap-2">
          <Field id="em-subject" label="Subject" value={subject} onChange={setSubject} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="em-body">Email</Label>
            <Textarea
              id="em-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <Field
            id="em-country"
            label="Country"
            value={country}
            onChange={(v) => setCountry(v.toUpperCase())}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="em-who">Who</Label>
            <NativeSelect
              id="em-who"
              value={who}
              onChange={(e) => setWho(e.target.value as typeof who)}
            >
              <option value="everyone">Everyone who opted in</option>
              <option value="buyers">Buyers</option>
              <option value="sellers">Sellers</option>
            </NativeSelect>
          </div>
        </div>
      }
      onConfirm={async (reason) => {
        await api.post("/admin/marketing/emails", {
          subject,
          body,
          audience: { country, who },
          reason,
        })
        setSubject("")
        setBody("")
        await refresh()
      }}
    />
  )
}

function EmailActions({ email }: Readonly<{ email: MarketingEmail }>) {
  const refresh = useRefresh()
  const [to, setTo] = useState("")
  const [at, setAt] = useState("")
  const open = email.status === "draft" || email.status === "scheduled"
  return (
    <div className="flex flex-wrap gap-2">
      <ReasonDialog
        trigger="Send a test"
        triggerLabel={`Send a test of ${email.subject}`}
        title="Send a test"
        description="One copy to the address you give; not counted."
        confirmLabel="Send test"
        fields={
          <Field
            id={`to-${email.id}`}
            label="Send to"
            type="email"
            value={to}
            onChange={setTo}
          />
        }
        onConfirm={async () => {
          await api.post(`/admin/marketing/emails/${email.id}/test`, { to })
          toast.success("Test sent")
        }}
      />
      {open && (
        <ReasonDialog
          trigger="Send or schedule"
          triggerLabel={`Send or schedule ${email.subject}`}
          title="Send this email?"
          description={`About ${email.stats.recipients} people (${email.stats.suppressed} suppressed). Leave the time empty to send now.`}
          confirmLabel="Confirm"
          fields={
            <Field
              id={`at-${email.id}`}
              label="Send at (optional)"
              type="datetime-local"
              value={at}
              onChange={setAt}
            />
          }
          onConfirm={async (reason) => {
            await api.post(`/admin/marketing/emails/${email.id}/schedule`, {
              reason,
              at: iso(at),
            })
            await refresh()
          }}
        />
      )}
      {open && (
        <ReasonDialog
          trigger="Cancel"
          triggerLabel={`Cancel ${email.subject}`}
          title="Cancel this email?"
          description="It won't be sent."
          confirmLabel="Cancel email"
          destructive
          onConfirm={async (reason) => {
            await api.post(`/admin/marketing/emails/${email.id}/cancel`, { reason })
            await refresh()
          }}
        />
      )}
    </div>
  )
}

function Emails() {
  usePageTitle("Marketing email")
  const { data, isPending, error } = useList<MarketingEmail>(
    keys.emails,
    "/admin/marketing/emails"
  )
  return (
    <>
      <div>
        <NewEmail />
      </div>
      <Loading error={error} pending={isPending} />
      <ul
        className="flex flex-col divide-y rounded-xl border text-sm"
        aria-label="Marketing emails"
      >
        {data?.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 font-medium">{e.subject}</span>
              <Badge variant="outline">
                {e.audience.country} · {e.audience.who}
              </Badge>
              <Badge variant="outline">{MARKETING_EMAIL_STATUS_LABELS[e.status]}</Badge>
            </div>
            <Text variant="muted">
              {e.scheduledAt && `Scheduled ${formatDateTime(e.scheduledAt)} · `}
              {e.stats.recipients} recipients · {e.stats.sent} sent · {e.stats.delivered}{" "}
              delivered · {e.stats.bounced} bounced · {e.stats.complained} spam ·{" "}
              {e.stats.unsubscribed} unsubscribed · {e.stats.suppressed} suppressed
            </Text>
            <EmailActions email={e} />
          </li>
        ))}
      </ul>
    </>
  )
}

// ---------- Services ----------

function ServiceDialog({ service }: Readonly<{ service?: MarketingService }>) {
  const refresh = useRefresh()
  const [kind, setKind] = useState<MarketingServiceKind>(
    service?.kind ?? "product_promotion"
  )
  const [name, setName] = useState(service?.name ?? "")
  const [description, setDescription] = useState(service?.description ?? "")
  const [credits, setCredits] = useState(String(service?.credits ?? 0))
  const [days, setDays] = useState(String(service?.days ?? 7))
  const [countries, setCountries] = useState(service?.countries.join(", ") ?? "")
  const [planIds, setPlanIds] = useState(service?.planIds.join(", ") ?? "")
  const [active, setActive] = useState(service?.active ?? true)
  const key = service?.id ?? "new"
  return (
    <ReasonDialog
      trigger={service ? "Edit" : "New service"}
      triggerVariant={service ? "outline" : "default"}
      triggerLabel={service ? `Edit ${service.name}` : undefined}
      title={service ? `Edit ${service.name}` : "New marketing service"}
      description="Sellers see it only where it applies (countries, packages)."
      confirmLabel="Save"
      fields={
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`kind-${key}`}>Kind</Label>
            <NativeSelect
              id={`kind-${key}`}
              value={kind}
              onChange={(e) => setKind(e.target.value as MarketingServiceKind)}
            >
              {MARKETING_SERVICE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {MARKETING_SERVICE_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Field id={`name-${key}`} label="Name" value={name} onChange={setName} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`desc-${key}`}>Description</Label>
            <Textarea
              id={`desc-${key}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Field
            id={`credits-${key}`}
            label="Credits"
            type="number"
            value={credits}
            onChange={setCredits}
          />
          <Field
            id={`days-${key}`}
            label="Days (promotions)"
            type="number"
            value={days}
            onChange={setDays}
          />
          <Field
            id={`countries-${key}`}
            label="Countries (empty = all)"
            value={countries}
            onChange={setCountries}
          />
          <Field
            id={`plans-${key}`}
            label="Package ids (empty = any)"
            value={planIds}
            onChange={setPlanIds}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Offered
          </label>
        </div>
      }
      onConfirm={async (reason) => {
        const body = {
          kind,
          name,
          description,
          credits: Number(credits),
          days: Number(days),
          countries: list(countries).map((c) => c.toUpperCase()),
          planIds: list(planIds),
          sellerTypes: service?.sellerTypes ?? [],
          active,
          reason,
        }
        await (service
          ? api.put(`/admin/marketing/services/${service.id}`, body)
          : api.post("/admin/marketing/services", body))
        await refresh()
      }}
    />
  )
}

function Services() {
  usePageTitle("Marketing services")
  const { data, isPending, error } = useList<MarketingService>(
    keys.services,
    "/admin/marketing/services"
  )
  return (
    <>
      <div>
        <ServiceDialog />
      </div>
      <Loading error={error} pending={isPending} />
      <ul
        className="flex flex-col divide-y rounded-xl border text-sm"
        aria-label="Services"
      >
        {data?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className="flex-1">
              <span className="font-medium">{s.name}</span> —{" "}
              {MARKETING_SERVICE_KIND_LABELS[s.kind]} · {s.credits} credits
              {s.countries.length > 0 && ` · ${s.countries.join(", ")}`}
            </span>
            <Badge variant="outline">{s.active ? "Offered" : "Off"}</Badge>
            <ServiceDialog service={s} />
          </li>
        ))}
      </ul>
    </>
  )
}

// ---------- Suppression list ----------

function Suppressions() {
  usePageTitle("Suppression list")
  const refresh = useRefresh()
  const { data, isPending, error } = useList<Suppression>(
    keys.suppressions,
    "/admin/marketing/suppressions"
  )
  const [email, setEmail] = useState("")
  return (
    <>
      <Text variant="muted">
        Marketing email never goes to these addresses. Order and account emails still do.
      </Text>
      <div>
        <ReasonDialog
          trigger="Add an address"
          title="Stop marketing email to an address"
          description="For requests made outside the unsubscribe link."
          confirmLabel="Add"
          fields={
            <Field
              id="sup-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
            />
          }
          onConfirm={async (reason) => {
            await api.post("/admin/marketing/suppressions", { email, reason })
            setEmail("")
            await refresh()
          }}
        />
      </div>
      <Loading error={error} pending={isPending} />
      <ul
        className="flex flex-col divide-y rounded-xl border text-sm"
        aria-label="Suppressed addresses"
      >
        {data?.map((s) => (
          <li key={s.email} className="flex flex-wrap gap-2 p-2">
            <span className="flex-1 font-mono text-xs">{s.email}</span>
            <Badge variant="outline">{SUPPRESSION_REASON_LABELS[s.reason]}</Badge>
            <span className="text-muted-foreground text-xs">{formatDateTime(s.at)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Content › Marketing, with its own tabs. */
export function Marketing() {
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/content" className="text-muted-foreground text-sm hover:underline">
        ← Content
      </Link>
      <Heading>Marketing</Heading>
      <SubNav
        label="Marketing"
        tabs={[
          { to: "", label: "Requests", end: true },
          { to: "campaigns", label: "Campaigns" },
          { to: "emails", label: "Email" },
          { to: "services", label: "Services" },
          { to: "suppressions", label: "Suppression list" },
        ]}
      />
      <Routes>
        <Route index element={<Requests />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="emails" element={<Emails />} />
        <Route path="services" element={<Services />} />
        <Route path="suppressions" element={<Suppressions />} />
      </Routes>
    </PageContainer>
  )
}
