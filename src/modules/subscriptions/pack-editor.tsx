import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import {
  CATALOG_STATUS_LABELS,
  PLAN_SIDE_LABELS,
  type AdminCreditPack,
  type CatalogStatus,
  type PlanSide,
} from "@acutehimanshu/core/domain/subscriptions"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import {
  createPack,
  getPack,
  listCountries,
  subscriptionKeys,
  updatePack,
} from "@/modules/subscriptions/api"
import { draftToPack, packToDraft, type PackDraft } from "@/modules/subscriptions/forms"
import { PriceRows } from "@/modules/subscriptions/price-rows"
import { useSide } from "@/modules/subscriptions/section-nav"

/** New credit pack (/packs/new?side=) or edit one (/packs/:id). */
export function PackEditor() {
  const { id } = useParams()
  const sideParam = useSide()
  const pack = useQuery({
    queryKey: subscriptionKeys.pack(id ?? "new"),
    queryFn: ({ signal }) => getPack(id!, { signal }),
    enabled: !!id,
  })
  const countries = useQuery({
    queryKey: subscriptionKeys.countries(),
    queryFn: ({ signal }) => listCountries({ signal }),
    staleTime: Infinity,
  })
  const error = pack.error ?? countries.error
  const loading = (!!id && pack.isPending) || countries.isPending
  usePageTitle(id ? (pack.data?.name ?? "Credit pack") : "New credit pack")

  return (
    <PageContainer maxWidth="2xl">
      <Link
        to={`/subscriptions/packs?side=${pack.data?.side ?? sideParam}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Credit packs
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the credit pack.")}
        </Text>
      ) : loading ? (
        <Skeleton className="h-80" />
      ) : (
        <PackForm
          key={pack.data?.updatedAt ?? "new"}
          existing={pack.data ?? null}
          side={pack.data?.side ?? sideParam}
          countries={countries.data!}
        />
      )}
    </PageContainer>
  )
}

function PackForm({
  existing,
  side,
  countries,
}: {
  existing: AdminCreditPack | null
  side: PlanSide
  countries: SupportedCountry[]
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<PackDraft>(() => packToDraft(existing))
  const set = <K extends keyof PackDraft>(key: K, value: PackDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const field = (
    key: "name" | "badge" | "credits" | "bonusCredits" | "validityMonths" | "order",
    label: string,
    number = false,
    hint?: string
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`pack-${key}`}>{label}</Label>
      <Input
        id={`pack-${key}`}
        type={number ? "number" : "text"}
        min={number ? 0 : undefined}
        className={number ? "w-28" : undefined}
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-1">
        <Heading>{existing ? existing.name : `New ${side} credit pack`}</Heading>
        <Text variant="muted">{PLAN_SIDE_LABELS[side]}</Text>
      </div>
      <form
        aria-label="Credit pack details"
        className="flex flex-col gap-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Name")}
          {field("badge", "Badge (optional)")}
          {field("credits", "Credits", true)}
          {field(
            "bonusCredits",
            "Bonus credits",
            true,
            "Extra on top, e.g. 500 + 50 free."
          )}
          {field(
            "validityMonths",
            "Credits last (months)",
            true,
            "From the day they're bought."
          )}
          {field("order", "Position on the page", true)}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-status">Status</Label>
            <NativeSelect
              id="pack-status"
              value={draft.status}
              onChange={(e) => set("status", e.target.value as CatalogStatus)}
            >
              {(Object.keys(CATALOG_STATUS_LABELS) as CatalogStatus[]).map((status) => (
                <option key={status} value={status}>
                  {CATALOG_STATUS_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <PriceRows<PackDraft["prices"][number]>
          rows={draft.prices}
          onChange={(prices) => set("prices", prices)}
          countries={countries}
          columns={[{ key: "price", label: "Price" }]}
          blank={{ country: "", price: "" }}
        />
        <div>
          <ReasonDialog
            trigger={existing ? "Save credit pack" : "Create credit pack"}
            triggerVariant="default"
            title={
              existing
                ? `Save ${draft.name || "credit pack"}?`
                : "Create this credit pack?"
            }
            description="Changes apply to new purchases only — credits already bought keep their own end date."
            confirmLabel={existing ? "Save" : "Create"}
            validate={() => {
              const result = draftToPack(draft, side, countries)
              return typeof result === "string" ? result : null
            }}
            noteRequired={!!existing}
            onConfirm={async (reason, note = "") => {
              const input = draftToPack(draft, side, countries)
              if (typeof input === "string") throw new Error(input)
              const saved = existing
                ? await updatePack(existing.id, input, { reason, note })
                : await createPack(side, input, reason)
              queryClient.setQueryData(subscriptionKeys.pack(saved.id), saved)
              await queryClient.invalidateQueries({
                queryKey: subscriptionKeys.packs(side),
              })
              toast.success(existing ? "Credit pack saved" : "Credit pack created")
              if (!existing)
                void navigate(`/subscriptions/packs/${saved.id}?side=${side}`)
            }}
          />
        </div>
      </form>
      {existing && <AuditHistory entries={existing.history} />}
    </>
  )
}
