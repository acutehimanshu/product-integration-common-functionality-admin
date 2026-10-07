import { OrderedIdList } from "@/components/ordered-id-list"
import { SecretFieldsEditor } from "@/components/secret-fields-editor"
import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import type { CountryProfile } from "@acutehimanshu/core/domain/country-profile"
import {
  CAPABILITY_LABELS,
  GATEWAYS,
  GATEWAY_INFO,
  PAYMENT_KIND_LABELS,
  gatewayProblem,
  missingCapabilities,
  type AdminPayments,
  type GatewayId,
  type PaymentGateway,
  type PaymentLogEntry,
  type PaymentRouting,
} from "@acutehimanshu/core/domain/payments"
import { formatMoney } from "@acutehimanshu/core/money"
import type { Page } from "@acutehimanshu/core/types/page"
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

const paymentsKey = ["admin", "payments"] as const

function GatewayFields({
  gateway,
  settings,
  secrets,
  existing,
  onSettings,
  onSecrets,
}: {
  gateway: GatewayId
  settings: Record<string, string>
  secrets: Record<string, string>
  existing?: PaymentGateway
  onSettings: (s: Record<string, string>) => void
  onSecrets: (s: Record<string, string>) => void
}) {
  return (
    <SecretFieldsEditor
      fields={GATEWAY_INFO[gateway].fields}
      idPrefix={`gateway-${existing?.id ?? "new"}`}
      settings={settings}
      secrets={secrets}
      kept={existing?.secrets}
      onSettings={onSettings}
      onSecrets={onSecrets}
    />
  )
}

function AddGateway() {
  const queryClient = useQueryClient()
  const [gateway, setGateway] = useState<GatewayId>("stripe_connect")
  const [name, setName] = useState("")
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const input = () => ({ gateway, name: name.trim(), settings, secrets })
  return (
    <ReasonDialog
      trigger="Add a gateway"
      triggerVariant="default"
      title="Add a payment gateway?"
      description="It's added switched off: test the connection, switch it on, then put it in a country's order. Keys can't be read back — only their last 4 characters show."
      confirmLabel="Add gateway"
      noteRequired
      fields={
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gateway-type">Gateway</Label>
            <NativeSelect
              id="gateway-type"
              value={gateway}
              onChange={(e) => {
                setGateway(e.target.value as GatewayId)
                setSettings({})
                setSecrets({})
              }}
            >
              {GATEWAYS.map((g) => (
                <option key={g} value={g}>
                  {GATEWAY_INFO[g].label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gateway-name">Name</Label>
            <Input
              id="gateway-name"
              value={name}
              placeholder="e.g. Stripe Australia"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <GatewayFields
            gateway={gateway}
            settings={settings}
            secrets={secrets}
            onSettings={setSettings}
            onSecrets={setSecrets}
          />
        </div>
      }
      validate={() => gatewayProblem(input())}
      onConfirm={async (reason, note = "") => {
        queryClient.setQueryData(
          paymentsKey,
          await api.post<AdminPayments>("/admin/payments/gateways", {
            ...input(),
            reason,
            note,
          })
        )
        setName("")
        setSettings({})
        setSecrets({})
        toast.success("Gateway added — test it, then switch it on")
      }}
    />
  )
}

function GatewayRow({ gateway }: { gateway: PaymentGateway }) {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState(gateway.settings)
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const info = GATEWAY_INFO[gateway.gateway]
  const patch = async (body: object) =>
    queryClient.setQueryData(
      paymentsKey,
      await api.patch<AdminPayments>(`/admin/payments/gateways/${gateway.id}`, body)
    )
  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">
          {gateway.name}{" "}
          <span className="text-muted-foreground font-normal">{info.label}</span>
        </span>
        <Badge variant={gateway.enabled ? "default" : "outline"}>
          {gateway.enabled ? "On" : "Off"}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Test ${gateway.name}`}
          onClick={async () => {
            try {
              const result = await api.post<{
                ok: boolean
                note?: string
                error?: string
              }>(`/admin/payments/gateways/${gateway.id}/test`)
              if (result.ok) toast.success(result.note ?? "Connected")
              else toast.error(result.error ?? "It didn't connect")
            } catch (error) {
              toast.error(getErrorMessage(error, "Couldn't test it."))
            }
          }}
        >
          Test connection
        </Button>
        <ReasonDialog
          trigger={gateway.enabled ? "Switch off" : "Switch on"}
          triggerLabel={`${gateway.enabled ? "Switch off" : "Switch on"} ${gateway.name}`}
          title={`${gateway.enabled ? "Switch off" : "Switch on"} ${gateway.name}?`}
          description={
            gateway.enabled
              ? "New payments skip it. Orders it already took keep using it for refunds and payouts."
              : "New payments use it wherever it's in the order."
          }
          confirmLabel={gateway.enabled ? "Switch off" : "Switch on"}
          noteRequired
          onConfirm={async (reason, note = "") => {
            await patch({ enabled: !gateway.enabled, reason, note })
            toast.success(gateway.enabled ? "Switched off" : "Switched on")
          }}
        />
        {info.fields.length > 0 && (
          <ReasonDialog
            trigger="Edit keys"
            triggerLabel={`Edit keys for ${gateway.name}`}
            title={`Edit ${gateway.name}?`}
            description="Leave a key empty to keep it."
            confirmLabel="Save"
            noteRequired
            fields={
              <div className="grid gap-3 sm:grid-cols-2">
                <GatewayFields
                  gateway={gateway.gateway}
                  settings={settings}
                  secrets={secrets}
                  existing={gateway}
                  onSettings={setSettings}
                  onSecrets={setSecrets}
                />
              </div>
            }
            validate={() =>
              gatewayProblem(
                { gateway: gateway.gateway, name: gateway.name, settings, secrets },
                gateway
              )
            }
            onConfirm={async (reason, note = "") => {
              await patch({ settings, secrets, reason, note })
              setSecrets({})
              toast.success("Saved")
            }}
          />
        )}
      </div>
      <Text variant="muted" className="text-xs">
        Can: {info.capabilities.map((c) => CAPABILITY_LABELS[c].toLowerCase()).join(", ")}
      </Text>
    </li>
  )
}

function OrderList({
  label,
  ids,
  gateways,
  onChange,
}: {
  label: string
  ids: string[]
  gateways: PaymentGateway[]
  onChange: (ids: string[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <OrderedIdList
        ids={ids}
        items={gateways}
        // Only gateways that can hold funds, split payouts and refund can be used.
        addable={gateways.filter(
          (g) => !ids.includes(g.id) && missingCapabilities(g.gateway).length === 0
        )}
        context={label}
        listLabel={`${label} gateway order`}
        addPlaceholder="Choose a gateway…"
        selectId={`add-gateway-${label}`.replace(/\W+/g, "-")}
        keepOne
        onChange={onChange}
      />
    </div>
  )
}

function Routing({
  data,
  countries,
}: {
  data: AdminPayments
  countries: CountryProfile[]
}) {
  const queryClient = useQueryClient()
  const [routing, setRouting] = useState<PaymentRouting>(data.routing)
  const [adding, setAdding] = useState("")
  const countryName = (code: string) =>
    countries.find((c) => c.code === code)?.name ?? code
  return (
    <section
      aria-labelledby="payment-routing"
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="payment-routing">
        Order
      </Heading>
      <Text variant="muted" className="text-sm">
        A payment goes to the first gateway that&apos;s on. If that gateway can&apos;t
        start it, the next one is tried — only before any money moves. Once paid, the
        order keeps its gateway for refunds and payouts.
      </Text>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Global</span>
        <OrderList
          label="Global"
          ids={routing.global}
          gateways={data.gateways}
          onChange={(ids) => setRouting((r) => ({ ...r, global: ids }))}
        />
      </div>
      {Object.entries(routing.countries).map(([code, ids]) => (
        <fieldset key={code} className="flex flex-col gap-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">{countryName(code)}</legend>
          <OrderList
            label={countryName(code)}
            ids={ids}
            gateways={data.gateways}
            onChange={(next) =>
              setRouting((r) => ({ ...r, countries: { ...r.countries, [code]: next } }))
            }
          />
          <div>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Use the global order in ${countryName(code)}`}
              onClick={() =>
                setRouting((r) => {
                  const next = { ...r.countries }
                  delete next[code]
                  return { ...r, countries: next }
                })
              }
            >
              Use the global order here
            </Button>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payment-country">Give a country its own order</Label>
          <NativeSelect
            id="payment-country"
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
          >
            <option value="">Choose…</option>
            {countries
              .filter((c) => !routing.countries[c.code])
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
          </NativeSelect>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!adding}
          onClick={() => {
            setRouting((r) => ({
              ...r,
              countries: { ...r.countries, [adding]: [...r.global] },
            }))
            setAdding("")
          }}
        >
          Add country
        </Button>
      </div>
      <div>
        <ReasonDialog
          trigger="Save order"
          triggerVariant="default"
          title="Save the gateway order?"
          description="New payments follow it straight away."
          confirmLabel="Save"
          noteRequired
          validate={() =>
            routing.global.length === 0
              ? "The global order needs at least one gateway."
              : null
          }
          onConfirm={async (reason, note = "") => {
            queryClient.setQueryData(
              paymentsKey,
              await api.put<AdminPayments>("/admin/payments/routing", {
                routing,
                reason,
                note,
              })
            )
            toast.success("Order saved")
          }}
        />
      </div>
    </section>
  )
}

function PaymentLog() {
  const [kind, setKind] = useState("")
  const query = kind ? `kind=${kind}` : ""
  const { data } = useQuery({
    queryKey: [...paymentsKey, "log", query],
    queryFn: ({ signal }) =>
      api.get<Page<PaymentLogEntry>>(`/admin/payments/log?${query}`, { signal }),
    placeholderData: keepPreviousData,
  })
  return (
    <section aria-labelledby="payment-log" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="payment-log">
        Payment log
      </Heading>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-log-kind">Kind</Label>
        <NativeSelect
          id="payment-log-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">All</option>
          {Object.entries(PAYMENT_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {!data ? (
        <Skeleton className="h-32" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nothing yet.</Text>
      ) : (
        <ol
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Payment log"
        >
          {data.items.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 p-3">
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant={e.ok ? "outline" : "destructive"}>
                  {e.ok ? "OK" : "Failed"}
                </Badge>
                <span className="font-medium">
                  {PAYMENT_KIND_LABELS[e.kind]}
                  {e.amount && ` · ${formatMoney(e.amount)}`}
                </span>
                <span className="text-muted-foreground">{e.gatewayName}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(e.at)}
                {e.orderIds.length > 0 && ` · ${e.orderIds.join(", ")}`}
                {e.reference && ` · ${e.reference}`}
                {e.error && ` · ${e.error}`}
                {e.note && ` · ${e.note}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Settings › Payments: gateways and their keys, the order per country, the payment log. */
export function PaymentsScreen() {
  usePageTitle("Payments")
  const { data, error } = useQuery({
    queryKey: paymentsKey,
    queryFn: ({ signal }) => api.get<AdminPayments>("/admin/payments", { signal }),
  })
  const countries = useQuery({
    queryKey: ["admin", "countries"],
    queryFn: ({ signal }) => api.get<CountryProfile[]>("/admin/countries", { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/settings" className="text-muted-foreground text-sm hover:underline">
        ← Marketplace settings
      </Link>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Heading>Payments</Heading>
          <Text variant="muted">
            Payment gateways per country. Buyers type card details only on the
            gateway&apos;s own page; sellers set up payouts on it too.
          </Text>
        </div>
        <AddGateway />
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load payments.")}
        </Text>
      ) : !data || !countries.data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {data.simulated && (
            <Text role="status" className="bg-muted/50 rounded-md p-3 text-sm">
              Test environment: real gateways are simulated — no money moves.
            </Text>
          )}
          <section aria-labelledby="gateways-heading" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="gateways-heading">
              Gateways
            </Heading>
            <ul
              className="flex flex-col divide-y rounded-xl border"
              aria-label="Gateways"
            >
              {data.gateways.map((g) => (
                <GatewayRow key={`${g.id}-${data.history[0]?.id ?? ""}`} gateway={g} />
              ))}
            </ul>
          </section>
          <Routing
            key={data.history[0]?.id ?? "initial"}
            data={data}
            countries={countries.data}
          />
          <PaymentLog />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
