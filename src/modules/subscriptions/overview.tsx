import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  CREDIT_ACTIONS,
  PLAN_SIDE_LABELS,
  type AdminSubscriptionOverview,
  type CreditCost,
  type PlanSide,
  type PriceChangePolicy,
  type SubscriptionSettings,
} from "@acutehimanshu/core/domain/subscriptions"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acutehimanshu/ui/components/ui/table"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import {
  getOverview,
  saveCosts,
  saveSettings,
  subscriptionKeys,
} from "@/modules/subscriptions/api"
import { SectionNav } from "@/modules/subscriptions/section-nav"

const SIDES: PlanSide[] = ["seller", "buyer"]

/** One switch: flip it with a reason, saved at once. */
function SwitchRow({
  label,
  description,
  on,
  onChange,
  disabled = false,
}: {
  label: string
  description: string
  on: boolean
  onChange: (on: boolean, reason: string, note: string) => Promise<unknown>
  disabled?: boolean
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
      <Badge variant={on ? "default" : "outline"}>{on ? "On" : "Off"}</Badge>
      {!disabled && (
        <ReasonDialog
          trigger={on ? "Turn off" : "Turn on"}
          title={`Turn ${label.toLowerCase()} ${on ? "off" : "on"}?`}
          description={
            on
              ? "Limits stop applying and nothing costs credits; package and credit pages disappear. Everyone's package and credits are kept for when it's back on."
              : "Package limits apply again and credit actions cost credits. Package and credit pages come back."
          }
          confirmLabel={on ? "Turn off" : "Turn on"}
          destructive={on}
          noteRequired
          onConfirm={(reason, note = "") => onChange(!on, reason, note)}
        />
      )}
    </li>
  )
}

function Switches({ overview }: { overview: AdminSubscriptionOverview }) {
  const queryClient = useQueryClient()
  const settings = overview.settings
  const save = async (next: SubscriptionSettings, reason: string, note: string) => {
    queryClient.setQueryData(
      subscriptionKeys.overview(),
      await saveSettings(next, { reason, note })
    )
    toast.success("Saved")
  }
  return (
    <section aria-labelledby="switches-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="switches-heading">
        On and off
      </Heading>
      <ul
        aria-label="Switches"
        className="flex flex-col divide-y rounded-xl border text-sm"
      >
        <SwitchRow
          label="Subscriptions"
          description="The master switch for packages and credits, for everyone."
          on={settings.enabled}
          onChange={(on, reason, note) =>
            save({ ...settings, enabled: on }, reason, note)
          }
        />
        {SIDES.map((side) => (
          <SwitchRow
            key={side}
            label={`${PLAN_SIDE_LABELS[side]} subscriptions`}
            description={
              settings.enabled
                ? `Packages and credits in the ${side} portal.`
                : "Off while the master switch is off."
            }
            on={settings.enabled && settings.sides[side]}
            disabled={!settings.enabled}
            onChange={(on, reason, note) =>
              save(
                { ...settings, sides: { ...settings.sides, [side]: on } },
                reason,
                note
              )
            }
          />
        ))}
      </ul>
    </section>
  )
}

function BillingRules({ overview }: { overview: AdminSubscriptionOverview }) {
  const queryClient = useQueryClient()
  const [graceDays, setGraceDays] = useState(String(overview.settings.graceDays))
  const [priceChanges, setPriceChanges] = useState<PriceChangePolicy>(
    overview.settings.priceChanges
  )
  const grace = Number(graceDays)
  return (
    <section aria-labelledby="billing-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="billing-heading">
        Billing rules
      </Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grace-days">After a failed payment, keep the package for</Label>
          <div className="flex items-center gap-2">
            <Input
              id="grace-days"
              type="number"
              min={0}
              max={30}
              className="w-24"
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
            />
            <span className="text-muted-foreground text-sm">days, then Free</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-changes">When a package price changes</Label>
          <NativeSelect
            id="price-changes"
            value={priceChanges}
            onChange={(e) => setPriceChanges(e.target.value as PriceChangePolicy)}
          >
            <option value="next_renewal">
              Existing subscribers pay it from their next renewal
            </option>
            <option value="keep_existing">
              Existing subscribers keep their old price
            </option>
          </NativeSelect>
        </div>
      </div>
      <div>
        <ReasonDialog
          trigger="Save billing rules"
          triggerVariant="default"
          title="Save billing rules?"
          description="They apply from the next renewal or failed payment."
          confirmLabel="Save"
          validate={() =>
            Number.isInteger(grace) && grace >= 0 && grace <= 30
              ? null
              : "Grace period: 0 to 30 days."
          }
          noteRequired
          onConfirm={async (reason, note = "") => {
            queryClient.setQueryData(
              subscriptionKeys.overview(),
              await saveSettings(
                { ...overview.settings, graceDays: grace, priceChanges },
                { reason, note }
              )
            )
            toast.success("Billing rules saved")
          }}
        />
      </div>
    </section>
  )
}

function CreditCosts({ overview }: { overview: AdminSubscriptionOverview }) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState(() =>
    overview.costs.map((cost) => ({ ...cost, text: String(cost.credits) }))
  )
  const update = (action: CreditCost["action"], patch: Partial<(typeof rows)[number]>) =>
    setRows((current) =>
      current.map((row) => (row.action === action ? { ...row, ...patch } : row))
    )
  const build = (): CreditCost[] | string => {
    const costs: CreditCost[] = []
    for (const row of rows) {
      const credits = Number(row.text)
      if (!Number.isInteger(credits) || credits < 1)
        return `${CREDIT_ACTIONS[row.action].label}: at least 1 credit.`
      costs.push({ action: row.action, credits, enabled: row.enabled })
    }
    return costs
  }
  return (
    <section aria-labelledby="costs-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Heading as="h2" size="h3" id="costs-heading">
          Credit costs
        </Heading>
        <Text variant="muted">
          What each action costs — with or without a package. Off = it can&apos;t be
          bought with credits (people have to upgrade instead).
        </Text>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.action}>
              <TableCell className="whitespace-normal">
                <span className="font-medium">{CREDIT_ACTIONS[row.action].label}</span>
                <span className="text-muted-foreground block text-xs">
                  {CREDIT_ACTIONS[row.action].description}
                </span>
              </TableCell>
              <TableCell>{PLAN_SIDE_LABELS[CREDIT_ACTIONS[row.action].side]}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  aria-label={`Credits for ${CREDIT_ACTIONS[row.action].label}`}
                  value={row.text}
                  onChange={(e) => update(row.action, { text: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`${CREDIT_ACTIONS[row.action].label} on`}
                  checked={row.enabled}
                  onChange={(e) => update(row.action, { enabled: e.target.checked })}
                  className="size-4"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div>
        <ReasonDialog
          trigger="Save credit costs"
          triggerVariant="default"
          title="Save credit costs?"
          description="New costs apply straight away to everyone. Credits already spent aren't affected."
          confirmLabel="Save"
          validate={() => {
            const result = build()
            return typeof result === "string" ? result : null
          }}
          noteRequired
          onConfirm={async (reason, note = "") => {
            queryClient.setQueryData(
              subscriptionKeys.overview(),
              await saveCosts(build() as CreditCost[], { reason, note })
            )
            toast.success("Credit costs saved")
          }}
        />
      </div>
    </section>
  )
}

export function Overview() {
  usePageTitle("Subscriptions")
  const { data, isPending, error } = useQuery({
    queryKey: subscriptionKeys.overview(),
    queryFn: ({ signal }) => getOverview({ signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Subscriptions</Heading>
        <Text variant="muted">
          Packages and credits for buyers and sellers. Credits work with or without a
          package. Every change is logged.
        </Text>
      </div>
      <SectionNav />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load subscriptions.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            {SIDES.map((side) => (
              <div key={side} className="rounded-xl border p-4 text-sm">
                <dt className="font-medium">{PLAN_SIDE_LABELS[side]}</dt>
                <dd className="text-muted-foreground">
                  {data.stats[side].paying} paying · {data.stats[side].trialing} on a
                  trial · {data.stats[side].cancelling} ending
                </dd>
              </div>
            ))}
          </dl>
          <Switches overview={data} />
          {/* Keyed so a save resets the forms to what the backend now holds. */}
          <BillingRules key={JSON.stringify(data.settings)} overview={data} />
          <CreditCosts key={JSON.stringify(data.costs)} overview={data} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
