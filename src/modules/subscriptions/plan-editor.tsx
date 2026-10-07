import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import {
  PLAN_SIDE_LABELS,
  type AdminPlanDetail,
  type PlanSide,
  type PublicPlan,
} from "@acutehimanshu/core/domain/subscriptions"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import {
  createPlan,
  getPlan,
  listCountries,
  subscriptionKeys,
  updatePlan,
} from "@/modules/subscriptions/api"
import {
  draftToPlan,
  planToDraft,
  type PlanDraft,
  type PriceDraft,
} from "@/modules/subscriptions/forms"
import {
  BasicsSection,
  LimitsSection,
  PerksSection,
  PreviewPanel,
} from "@/modules/subscriptions/plan-form-sections"
import { PriceRows } from "@/modules/subscriptions/price-rows"
import { useSide } from "@/modules/subscriptions/section-nav"

/** New package (/packages/new?side=) or edit one (/packages/:id). */
export function PlanEditor() {
  const { id } = useParams()
  const sideParam = useSide()
  const plan = useQuery({
    queryKey: subscriptionKeys.plan(id ?? "new"),
    queryFn: ({ signal }) => getPlan(id!, { signal }),
    enabled: !!id,
  })
  const countries = useQuery({
    queryKey: subscriptionKeys.countries(),
    queryFn: ({ signal }) => listCountries({ signal }),
    staleTime: Infinity,
  })
  const error = plan.error ?? countries.error
  const loading = (!!id && plan.isPending) || countries.isPending
  usePageTitle(id ? (plan.data?.name ?? "Package") : "New package")

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to={`/subscriptions/packages?side=${plan.data?.side ?? sideParam}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Packages
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the package.")}
        </Text>
      ) : loading ? (
        <Skeleton className="h-96" />
      ) : (
        <PlanForm
          key={plan.data?.updatedAt ?? "new"}
          existing={plan.data ?? null}
          side={plan.data?.side ?? sideParam}
          countries={countries.data!}
        />
      )}
    </PageContainer>
  )
}

function PlanForm({
  existing,
  side,
  countries,
}: {
  existing: AdminPlanDetail | null
  side: PlanSide
  countries: SupportedCountry[]
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<PlanDraft>(() => planToDraft(existing, side))
  const set = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const isFree = existing?.isFree ?? false
  const result = draftToPlan(draft, side, countries, isFree)

  // The preview shows the first price row's country, as its people would see it.
  const preview: PublicPlan | null =
    typeof result === "string"
      ? null
      : {
          id: existing?.id ?? "new",
          side,
          name: result.name,
          description: result.description,
          badge: result.badge,
          isFree,
          monthlyCredits: result.monthlyCredits,
          limits: result.limits,
          perks: result.perks,
          features: result.features,
          trialDays: result.trialDays,
          monthly: result.prices[0]?.monthly ?? null,
          yearly: result.prices[0]?.yearly ?? null,
        }

  return (
    <>
      <div className="flex flex-col gap-1">
        <Heading>{existing ? existing.name : `New ${side} package`}</Heading>
        <Text variant="muted">
          {PLAN_SIDE_LABELS[side]}
          {existing
            ? ` · ${existing.subscriberCount} ${existing.subscriberCount === 1 ? "person" : "people"} on it`
            : ""}
          {isFree ? " · Everyone starts here; it has no price." : ""}
        </Text>
      </div>

      <form
        aria-label="Package details"
        className="grid gap-6 lg:grid-cols-[1fr_280px]"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-5">
          <BasicsSection draft={draft} set={set} isFree={isFree} />

          {!isFree && (
            <PriceRows<PriceDraft>
              rows={draft.prices}
              onChange={(prices) => set("prices", prices)}
              countries={countries}
              columns={[
                { key: "monthly", label: "Monthly" },
                { key: "yearly", label: "Yearly", optional: true },
              ]}
              blank={{ country: "", monthly: "", yearly: "" }}
            />
          )}

          <LimitsSection draft={draft} set={set} isFree={isFree} side={side} />

          {side === "seller" && <PerksSection draft={draft} set={set} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-features">
              Feature lines on the pricing page (one per line)
            </Label>
            <Textarea
              id="plan-features"
              rows={5}
              value={draft.features}
              onChange={(e) => set("features", e.target.value)}
            />
            <span className="text-muted-foreground text-xs">
              Wording only — the limits above are what's enforced, so keep the two in
              step. Leave empty to list the limits automatically.
            </span>
          </div>

          <div>
            <ReasonDialog
              trigger={existing ? "Save package" : "Create package"}
              triggerVariant="default"
              title={
                existing ? `Save ${draft.name || "package"}?` : "Create this package?"
              }
              description={
                existing
                  ? "Limit changes apply to everyone on it now (listings over a lower limit are paused, not deleted). Price changes follow the billing rules on the Overview."
                  : "It's saved with the status you chose — Draft keeps it out of sight."
              }
              confirmLabel={existing ? "Save" : "Create"}
              validate={() => (typeof result === "string" ? result : null)}
              noteRequired={!!existing}
              onConfirm={async (reason, note = "") => {
                const input = draftToPlan(draft, side, countries, isFree)
                if (typeof input === "string") throw new Error(input)
                const saved = existing
                  ? await updatePlan(existing.id, input, { reason, note })
                  : await createPlan(side, input, reason)
                queryClient.setQueryData(subscriptionKeys.plan(saved.id), saved)
                await queryClient.invalidateQueries({
                  queryKey: subscriptionKeys.plans(side),
                })
                toast.success(existing ? "Package saved" : "Package created")
                if (!existing)
                  void navigate(`/subscriptions/packages/${saved.id}?side=${side}`)
              }}
            />
          </div>
        </div>

        <PreviewPanel
          plan={preview}
          problem={typeof result === "string" ? result : null}
        />
      </form>

      {existing && <AuditHistory entries={existing.history} />}
    </>
  )
}
