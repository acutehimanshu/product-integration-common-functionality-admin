import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { allTimeZones } from "@acutehimanshu/core/dates"
import {
  COUNTRY_STATUSES,
  COUNTRY_STATUS_LABELS,
  PROVIDER_SLOTS,
  PROVIDER_SLOT_LABELS,
  countryProfileProblem,
  type AdminCountry,
  type CountryProfileInput,
  type CountryStatus,
} from "@acutehimanshu/core/domain/country-profile"
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

export const countryKey = (code: string) => ["admin", "countries", code] as const

/** The editable part of a profile, as typed in the form. */
export function toInput(country: AdminCountry): CountryProfileInput {
  return {
    status: country.status,
    buyersCanRegister: country.buyersCanRegister,
    sellingEnabled: country.sellingEnabled,
    crossBorder: country.crossBorder,
    currency: country.currency,
    extraCurrencies: country.extraCurrencies,
    timeZone: country.timeZone,
    tax: country.tax,
    support: country.support,
    providers: country.providers,
  }
}

/** "USD, EUR" → ["USD", "EUR"]. */
export function parseCurrencies(text: string): string[] {
  return text
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function Editor({ country }: { country: AdminCountry }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CountryProfileInput>(() => toInput(country))
  const [extra, setExtra] = useState(country.extraCurrencies.join(", "))
  const [rate, setRate] = useState(
    country.tax.ratePercent === null ? "" : String(country.tax.ratePercent)
  )
  const set = (change: Partial<CountryProfileInput>) =>
    setForm((f) => ({ ...f, ...change }))
  const zones = allTimeZones()

  const build = (): CountryProfileInput => ({
    ...form,
    currency: form.currency.trim().toUpperCase(),
    extraCurrencies: parseCurrencies(extra),
    tax: {
      ...form.tax,
      label: form.tax.label.trim(),
      ratePercent: rate.trim() === "" ? null : Number(rate),
    },
    support: {
      hours: form.support.hours.trim(),
      email: form.support.email?.trim() || null,
      phone: form.support.phone?.trim() || null,
    },
    providers: Object.fromEntries(
      PROVIDER_SLOTS.map((slot) => [slot, form.providers[slot]?.trim() || null])
    ) as CountryProfileInput["providers"],
  })

  return (
    <>
      <section aria-labelledby="country-market" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="country-market">
          Marketplace
        </Heading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="country-status" label="Status">
            <NativeSelect
              id="country-status"
              value={form.status}
              onChange={(e) => set({ status: e.target.value as CountryStatus })}
            >
              {COUNTRY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {COUNTRY_STATUS_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            id="country-zone"
            label="Time zone"
            hint="Dates are shown in it for people there."
          >
            <NativeSelect
              id="country-zone"
              value={form.timeZone}
              onChange={(e) => set({ timeZone: e.target.value })}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Check
          label="Buyers there can sign up"
          checked={form.buyersCanRegister}
          onChange={(on) => set({ buyersCanRegister: on })}
        />
        <Check
          label="People there can sell"
          checked={form.sellingEnabled}
          onChange={(on) => set({ sellingEnabled: on })}
        />
        <Check
          label="Cross-border: sellers there can sell to other countries"
          checked={form.crossBorder}
          onChange={(on) => set({ crossBorder: on })}
        />
      </section>

      <section aria-labelledby="country-money" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="country-money">
          Money and tax
        </Heading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="country-currency" label="Main currency">
            <Input
              id="country-currency"
              value={form.currency}
              maxLength={3}
              onChange={(e) => set({ currency: e.target.value })}
            />
          </Field>
          <Field
            id="country-extra"
            label="Other currencies"
            hint="For defined flows, e.g. USD for cross-border. Separate with commas."
          >
            <Input
              id="country-extra"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </Field>
          <Field id="country-tax-label" label="Tax name">
            <Input
              id="country-tax-label"
              value={form.tax.label}
              maxLength={30}
              onChange={(e) => set({ tax: { ...form.tax, label: e.target.value } })}
            />
          </Field>
          <Field
            id="country-tax-rate"
            label="Tax rate (%)"
            hint="Empty = varies (worked out per order)."
          >
            <Input
              id="country-tax-rate"
              type="number"
              min={0}
              max={50}
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        </div>
        <Check
          label="Confirmed by tax advisers (otherwise shown as a placeholder)"
          checked={form.tax.confirmed}
          onChange={(on) => set({ tax: { ...form.tax, confirmed: on } })}
        />
      </section>

      <section aria-labelledby="country-support" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="country-support">
          Support
        </Heading>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="country-hours" label="Hours">
            <Input
              id="country-hours"
              value={form.support.hours}
              placeholder="Mon–Fri 9am–5pm"
              onChange={(e) =>
                set({ support: { ...form.support, hours: e.target.value } })
              }
            />
          </Field>
          <Field id="country-email" label="Email">
            <Input
              id="country-email"
              type="email"
              value={form.support.email ?? ""}
              onChange={(e) =>
                set({ support: { ...form.support, email: e.target.value } })
              }
            />
          </Field>
          <Field id="country-phone" label="Phone">
            <Input
              id="country-phone"
              value={form.support.phone ?? ""}
              onChange={(e) =>
                set({ support: { ...form.support, phone: e.target.value } })
              }
            />
          </Field>
        </div>
      </section>

      <section aria-labelledby="country-providers" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="country-providers">
          Partners
        </Heading>
        <Text variant="muted" className="text-sm">
          Which partner handles each job here. Empty = not connected yet.
        </Text>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROVIDER_SLOTS.map((slot) => (
            <Field
              key={slot}
              id={`country-provider-${slot}`}
              label={PROVIDER_SLOT_LABELS[slot]}
            >
              <Input
                id={`country-provider-${slot}`}
                value={form.providers[slot] ?? ""}
                placeholder="Not connected"
                onChange={(e) =>
                  set({ providers: { ...form.providers, [slot]: e.target.value } })
                }
              />
            </Field>
          ))}
        </div>
      </section>

      <div>
        <ReasonDialog
          trigger="Save country"
          triggerVariant="default"
          title={`Save ${country.name}'s settings?`}
          description="Changes apply straight away. Orders already placed keep their own rules."
          confirmLabel="Save"
          noteRequired
          validate={() => countryProfileProblem(build(), country.code)}
          onConfirm={async (reason, note = "") => {
            const updated = await api.put<AdminCountry>(
              `/admin/countries/${country.code}`,
              {
                ...build(),
                reason,
                note,
              }
            )
            queryClient.setQueryData(countryKey(country.code), updated)
            await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
            toast.success(`${country.name} saved`)
          }}
        />
      </div>

      <section aria-labelledby="country-legal" className="flex flex-col gap-2">
        <Heading as="h2" size="h3" id="country-legal">
          Legal pages
        </Heading>
        <Text variant="muted" className="text-sm">
          A country version replaces the global text for people in {country.name}.
        </Text>
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Legal pages"
        >
          {country.legal.map((page) => (
            <li key={page.slug} className="flex flex-wrap items-center gap-3 p-3">
              <Link
                to={`/content/${page.slug}?country=${country.code}`}
                className="flex-1 font-medium hover:underline"
              >
                {page.title}
              </Link>
              {page.countryVersion ? (
                <Badge variant="outline">Own version {page.countryVersion.version}</Badge>
              ) : (
                <span className="text-muted-foreground">Uses the global text</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/** Settings › Countries › one country's profile (Country Master, BRD §9). */
export function CountryEditor() {
  const { code = "" } = useParams()
  const { data, error } = useQuery({
    queryKey: countryKey(code),
    queryFn: ({ signal }) =>
      api.get<AdminCountry>(`/admin/countries/${code}`, { signal }),
  })
  usePageTitle(data?.name ?? "Country")
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/settings" className="text-muted-foreground text-sm hover:underline">
        ← Marketplace settings
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this country.")}
        </Text>
      ) : !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{data.name}</Heading>
            <Badge variant="outline">{COUNTRY_STATUS_LABELS[data.status]}</Badge>
          </div>
          <Editor key={data.history[0]?.id ?? "initial"} country={data} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
