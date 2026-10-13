import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

type Step = { label: string; count: number }
type Funnels = {
  attribution: { model: string; windowDays: number }
  marketplace: Step[]
  content: Step[]
  negotiation: Step[]
  rfq: Step[]
  sellers: Step[]
  campaigns: Array<{ campaignId: string; steps: Step[] }>
  directOrders: number
}
type Quality = {
  rawRetentionDays: number
  storedEvents: number
  pendingInSink: number
  perName: Array<{
    name: string
    known: boolean
    accepted: number
    duplicates: number
    quarantined: number
    lastAt?: string
  }>
  quarantine: Array<{
    event: { name: string; source: string }
    problem: string
    at: string
  }>
}
type Taxonomy = {
  events: Array<{
    name: string
    domain: string
    version: number
    description: string
    fromBrowser: boolean
  }>
  metrics: Array<{ id: string; label: string; definition: string }>
}

function Funnel({ title, steps }: Readonly<{ title: string; steps: Step[] }>) {
  const top = steps[0]?.count ?? 0
  return (
    <section
      className="flex flex-col gap-1 rounded-xl border p-3 text-sm"
      aria-label={title}
    >
      <h3 className="font-medium">{title}</h3>
      <ol className="flex flex-col gap-0.5">
        {steps.map((s) => (
          <li key={s.label} className="flex justify-between gap-3">
            <span>{s.label}</span>
            <span className="tabular-nums">
              {s.count}
              {top > 0 && s !== steps[0] && (
                <span className="text-muted-foreground">
                  {" "}
                  ({Math.round((s.count / top) * 100)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Admin › Reports › Analytics (FRD-09 ANL-001..019): funnels, data quality
 * (quarantined events), and the event and metric dictionary.
 */
export function AnalyticsScreen() {
  usePageTitle("Analytics")
  const funnels = useQuery({
    queryKey: ["admin", "analytics", "funnels"],
    queryFn: ({ signal }) => api.get<Funnels>("/admin/analytics/funnels", { signal }),
  })
  const quality = useQuery({
    queryKey: ["admin", "analytics", "quality"],
    queryFn: ({ signal }) => api.get<Quality>("/admin/analytics/quality", { signal }),
  })
  const taxonomy = useQuery({
    queryKey: ["admin", "analytics", "taxonomy"],
    queryFn: ({ signal }) => api.get<Taxonomy>("/admin/analytics/taxonomy", { signal }),
  })
  const error = funnels.error ?? quality.error ?? taxonomy.error
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/reports" className="text-muted-foreground text-sm hover:underline">
        ← Reports
      </Link>
      <Heading>Analytics</Heading>
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load analytics.")}
        </Text>
      )}
      {funnels.isPending && <Skeleton className="h-40" />}
      {funnels.data && (
        <>
          <Text variant="muted">
            Orders are credited to a campaign by{" "}
            {funnels.data.attribution.model.replace("_", " ")} within{" "}
            {funnels.data.attribution.windowDays} days; {funnels.data.directOrders} orders
            had no campaign touch (Direct).
          </Text>
          <div className="grid gap-3 sm:grid-cols-2">
            <Funnel title="Marketplace" steps={funnels.data.marketplace} />
            <Funnel title="Content to commerce" steps={funnels.data.content} />
            <Funnel title="Negotiation" steps={funnels.data.negotiation} />
            <Funnel title="Buyer requests" steps={funnels.data.rfq} />
            <Funnel title="Seller activation" steps={funnels.data.sellers} />
            {funnels.data.campaigns.map((c) => (
              <Funnel
                key={c.campaignId}
                title={`Campaign ${c.campaignId}`}
                steps={c.steps}
              />
            ))}
          </div>
        </>
      )}
      {quality.data && (
        <section
          aria-labelledby="quality-heading"
          className="flex flex-col gap-2 text-sm"
        >
          <Heading as="h2" size="h3" id="quality-heading">
            Data quality
          </Heading>
          <Text variant="muted">
            {quality.data.storedEvents} events kept ({quality.data.rawRetentionDays} days
            raw) · {quality.data.pendingInSink} waiting for the analytics tool
          </Text>
          <ul
            className="flex flex-col divide-y rounded-xl border"
            aria-label="Events by name"
          >
            {quality.data.perName.map((n) => (
              <li key={n.name} className="flex flex-wrap items-center gap-2 p-2">
                <span className="flex-1 font-mono text-xs">{n.name}</span>
                {!n.known && <Badge variant="destructive">Unknown</Badge>}
                <span className="text-xs">
                  {n.accepted} kept · {n.duplicates} repeats · {n.quarantined} quarantined
                  {n.lastAt && ` · last ${formatDateTime(n.lastAt)}`}
                </span>
              </li>
            ))}
          </ul>
          {quality.data.quarantine.length > 0 && (
            <ul className="flex flex-col gap-1" aria-label="Quarantined events">
              {quality.data.quarantine.slice(0, 20).map((q) => (
                <li key={`${q.at}-${q.event.name}`} className="text-xs">
                  {formatDateTime(q.at)} — {q.event.name} ({q.event.source}): {q.problem}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {taxonomy.data && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            Event and metric dictionary
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {taxonomy.data.metrics.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.label}:</span> {m.definition}
              </li>
            ))}
          </ul>
          <ul className="mt-2 flex flex-col gap-1">
            {taxonomy.data.events.map((e) => (
              <li key={e.name}>
                <span className="font-mono text-xs">{e.name}</span> v{e.version} (
                {e.domain}
                {e.fromBrowser ? ", from the portal" : ""}) — {e.description}
              </li>
            ))}
          </ul>
        </details>
      )}
    </PageContainer>
  )
}
