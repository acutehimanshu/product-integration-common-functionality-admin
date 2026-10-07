import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes } from "react-router"
import { toast } from "sonner"
import { COUNTRY_STATUS_LABELS } from "@acutehimanshu/core/domain/country-profile"
import type { AdminSettings } from "@acutehimanshu/core/domain/admin-content"
import type { MarketplaceSettings } from "@acutehimanshu/core/marketplace-settings"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import { CountryEditor } from "@/modules/settings/country-editor"
import { RulesScreen } from "@/modules/settings/rules-screen"
import { MessagingScreen } from "@/modules/settings/messaging"
import { PaymentsScreen } from "@/modules/settings/payments"

const settingsKeys = { all: ["admin", "settings"] as const }

type Limits = MarketplaceSettings["limits"]

const LIMITS: Array<{ key: keyof Limits; label: string; unit: string }> = [
  { key: "checkoutHoldMinutes", label: "Stock held while paying", unit: "minutes" },
  { key: "acceptedHoldHours", label: "Accepted offer / quote held", unit: "hours" },
  { key: "maxOfferRounds", label: "Offer rounds", unit: "rounds" },
  { key: "offerResponseHours", label: "Time to answer an offer", unit: "hours" },
  { key: "requestOpenDays", label: "Buyer requests stay open", unit: "days" },
  { key: "quoteValidDays", label: "Quotes valid for", unit: "days" },
  { key: "shipByBusinessDays", label: "Seller must ship within", unit: "business days" },
  {
    key: "problemWindowDays",
    label: "Problems reported within",
    unit: "days after delivery",
  },
  {
    key: "sellerProblemReplyDays",
    label: "Seller replies to problems within",
    unit: "days",
  },
]

function SettingsForm({ current }: { current: AdminSettings }) {
  const queryClient = useQueryClient()
  const [limits, setLimits] = useState<Record<keyof Limits, string>>(
    () =>
      Object.fromEntries(
        LIMITS.map(({ key }) => [key, String(current.settings.limits[key])])
      ) as Record<keyof Limits, string>
  )
  const fee = current.settings.platformFee
  const [feeOn, setFeeOn] = useState(fee !== null)
  const [feePercent, setFeePercent] = useState(fee ? String(fee.percent) : "")
  const [chargedTo, setChargedTo] = useState<"seller" | "buyer" | "split">(
    fee?.chargedTo ?? "seller"
  )

  const build = (): MarketplaceSettings | string => {
    const parsed = {} as Limits
    for (const { key, label } of LIMITS) {
      const value = Number(limits[key])
      if (!Number.isInteger(value) || value < 1)
        return `${label}: enter a whole number above 0.`
      parsed[key] = value
    }
    const percent = Number(feePercent)
    if (feeOn && !(percent >= 0 && percent <= 50))
      return "Platform fee: enter a percentage from 0 to 50."
    return {
      limits: parsed,
      platformFee: feeOn ? { percent, chargedTo } : null,
    }
  }

  return (
    <>
      <section aria-labelledby="limits-heading" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="limits-heading">
          Time limits
        </Heading>
        <div className="grid gap-3 sm:grid-cols-2">
          {LIMITS.map(({ key, label, unit }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`limit-${key}`}>{label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`limit-${key}`}
                  type="number"
                  min={1}
                  className="w-24"
                  value={limits[key]}
                  onChange={(event) =>
                    setLimits({ ...limits, [key]: event.target.value })
                  }
                />
                <span className="text-muted-foreground text-sm">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="fee-heading" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="fee-heading">
          Platform fee
        </Heading>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={feeOn}
            onChange={(e) => setFeeOn(e.target.checked)}
          />
          Charge a platform fee
        </label>
        {feeOn && (
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fee-percent">Percent of the sale</Label>
              <Input
                id="fee-percent"
                type="number"
                min={0}
                max={50}
                step="0.1"
                className="w-24"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fee-charged-to">Paid by</Label>
              <NativeSelect
                id="fee-charged-to"
                value={chargedTo}
                onChange={(e) => setChargedTo(e.target.value as typeof chargedTo)}
              >
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
                <option value="split">Split</option>
              </NativeSelect>
            </div>
          </div>
        )}
      </section>

      <div>
        <ReasonDialog
          trigger="Save settings"
          triggerVariant="default"
          title="Save marketplace settings?"
          description="They apply to new orders, offers and requests from now on."
          confirmLabel="Save"
          validate={() => {
            const result = build()
            return typeof result === "string" ? result : null
          }}
          noteRequired
          onConfirm={async (reason, note = "") => {
            const settings = build() as MarketplaceSettings
            queryClient.setQueryData(
              settingsKeys.all,
              await api.put<AdminSettings>("/admin/settings", {
                settings,
                reason,
                note,
              })
            )
            toast.success("Settings saved")
          }}
        />
      </div>
    </>
  )
}

function GlobalSettings() {
  usePageTitle("Marketplace settings")
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: settingsKeys.all,
    queryFn: ({ signal }) => api.get<AdminSettings>("/admin/settings", { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Marketplace settings</Heading>
        <Text variant="muted">
          The global values the whole marketplace runs on. Changes are logged and apply to
          new orders; orders already placed keep theirs.
        </Text>
        <Text className="text-sm">
          <Link to="rules" className="font-medium underline underline-offset-4">
            Rules
          </Link>{" "}
          change a value for one country, category, seller type or seller, from a date.{" "}
          <Link to="messaging" className="font-medium underline underline-offset-4">
            Messaging
          </Link>{" "}
          sets up the email and SMS providers, and{" "}
          <Link to="payments" className="font-medium underline underline-offset-4">
            Payments
          </Link>{" "}
          the payment gateways.
        </Text>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load settings.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <SettingsForm current={data} />

          <section aria-labelledby="countries-heading" className="flex flex-col gap-3">
            <Heading as="h2" size="h3" id="countries-heading">
              Countries
            </Heading>
            <Text variant="muted">
              Each country's profile: status, who can sign up and sell, currencies, time
              zone, tax, support, partners and its own legal pages.
            </Text>
            <ul
              className="flex flex-col divide-y rounded-xl border text-sm"
              aria-label="Countries"
            >
              {data.countries.map((country) => (
                <li key={country.code} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="flex-1 font-medium">
                    <Link to={`countries/${country.code}`} className="hover:underline">
                      {country.name}
                    </Link>{" "}
                    <span className="text-muted-foreground font-normal">
                      ({country.currency})
                    </span>
                  </span>
                  <Badge variant="outline">{COUNTRY_STATUS_LABELS[country.status]}</Badge>
                  <Badge variant="outline">
                    {country.sellingEnabled ? "Selling open" : "Buying only"}
                  </Badge>
                  <ReasonDialog
                    trigger={country.sellingEnabled ? "Close selling" : "Open selling"}
                    title={`${country.sellingEnabled ? "Close" : "Open"} selling in ${country.name}?`}
                    description={
                      country.sellingEnabled
                        ? "New sellers there can't start selling. Existing sellers carry on."
                        : "People there can start selling. Make sure payouts and tax are ready there first."
                    }
                    confirmLabel={
                      country.sellingEnabled ? "Close selling" : "Open selling"
                    }
                    noteRequired
                    onConfirm={async (reason, note) => {
                      queryClient.setQueryData(
                        settingsKeys.all,
                        await api.patch<AdminSettings>(
                          `/admin/settings/countries/${country.code}`,
                          { sellingEnabled: !country.sellingEnabled, reason, note }
                        )
                      )
                      toast.success(
                        `Selling ${country.sellingEnabled ? "closed" : "opened"}`
                      )
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>

          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}

/** Settings: global values and countries; each country's profile; rules. */
export default function SettingsPage() {
  return (
    <Routes>
      <Route index element={<GlobalSettings />} />
      <Route path="countries/:code" element={<CountryEditor />} />
      <Route path="rules" element={<RulesScreen />} />
      <Route path="messaging" element={<MessagingScreen />} />
      <Route path="payments" element={<PaymentsScreen />} />
    </Routes>
  )
}
