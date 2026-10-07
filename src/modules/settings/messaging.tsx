import { OrderedIdList } from "@/components/ordered-id-list"
import { SecretFieldsEditor } from "@/components/secret-fields-editor"
import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import type { CountryProfile } from "@acutehimanshu/core/domain/country-profile"
import {
  ADAPTERS,
  ADAPTER_INFO,
  CHANNELS,
  CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
  adapterChannels,
  providerProblem,
  type AdapterId,
  type AdminMessaging,
  type Channel,
  type ChannelOrder,
  type DeliveryLogEntry,
  type MessagingProvider,
  type MessagingRouting,
  type OutboxMessage,
} from "@acutehimanshu/core/domain/messaging"
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

const messagingKey = ["admin", "messaging"] as const

function ProviderFields({
  adapter,
  settings,
  secrets,
  existing,
  onSettings,
  onSecrets,
}: {
  adapter: AdapterId
  settings: Record<string, string>
  secrets: Record<string, string>
  existing?: MessagingProvider
  onSettings: (s: Record<string, string>) => void
  onSecrets: (s: Record<string, string>) => void
}) {
  return (
    <SecretFieldsEditor
      fields={ADAPTER_INFO[adapter].fields}
      idPrefix={`provider-${existing?.id ?? "new"}`}
      settings={settings}
      secrets={secrets}
      kept={existing?.secrets}
      onSettings={onSettings}
      onSecrets={onSecrets}
    />
  )
}

function AddProvider() {
  const queryClient = useQueryClient()
  const [adapter, setAdapter] = useState<AdapterId>("twilio")
  const [channel, setChannel] = useState<Channel>("sms")
  const [name, setName] = useState("")
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const channels = adapterChannels(adapter)
  const input = () => ({ adapter, channel, name: name.trim(), settings, secrets })
  return (
    <ReasonDialog
      trigger="Add a provider"
      triggerVariant="default"
      title="Add a provider?"
      description="It's added switched off: send a test, then switch it on and put it in the order. Keys can't be read back — only their last 4 characters show."
      confirmLabel="Add provider"
      noteRequired
      fields={
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-adapter">Provider</Label>
            <NativeSelect
              id="provider-adapter"
              value={adapter}
              onChange={(e) => {
                const next = e.target.value as AdapterId
                setAdapter(next)
                const firstChannel = adapterChannels(next)[0]
                if (firstChannel) setChannel(firstChannel)
                setSettings({})
                setSecrets({})
              }}
            >
              {ADAPTERS.map((a) => (
                <option key={a} value={a}>
                  {ADAPTER_INFO[a].label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-channel">Sends</Label>
            <NativeSelect
              id="provider-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              {channels.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="provider-name">Name</Label>
            <Input
              id="provider-name"
              value={name}
              placeholder="e.g. Twilio Australia"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <ProviderFields
            adapter={adapter}
            settings={settings}
            secrets={secrets}
            onSettings={setSettings}
            onSecrets={setSecrets}
          />
        </div>
      }
      validate={() => providerProblem(input())}
      onConfirm={async (reason, note = "") => {
        queryClient.setQueryData(
          messagingKey,
          await api.post<AdminMessaging>("/admin/messaging/providers", {
            ...input(),
            reason,
            note,
          })
        )
        setName("")
        setSettings({})
        setSecrets({})
        toast.success("Provider added — send a test, then switch it on")
      }}
    />
  )
}

function ProviderRow({ provider }: { provider: MessagingProvider }) {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState(provider.settings)
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [to, setTo] = useState("")
  const [testing, setTesting] = useState(false)
  const hasFields = ADAPTER_INFO[provider.adapter].fields.length > 0
  const patch = async (body: object) =>
    queryClient.setQueryData(
      messagingKey,
      await api.patch<AdminMessaging>(`/admin/messaging/providers/${provider.id}`, body)
    )
  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">
          {provider.name}{" "}
          <span className="text-muted-foreground font-normal">
            {ADAPTER_INFO[provider.adapter].label} · {CHANNEL_LABELS[provider.channel]}
          </span>
        </span>
        <Badge variant={provider.enabled ? "default" : "outline"}>
          {provider.enabled ? "On" : "Off"}
        </Badge>
        <ReasonDialog
          trigger={provider.enabled ? "Switch off" : "Switch on"}
          triggerLabel={`${provider.enabled ? "Switch off" : "Switch on"} ${provider.name}`}
          title={`${provider.enabled ? "Switch off" : "Switch on"} ${provider.name}?`}
          description={
            provider.enabled
              ? "Messages skip it and go to the next provider in the order."
              : "Messages use it wherever it's in the order."
          }
          confirmLabel={provider.enabled ? "Switch off" : "Switch on"}
          noteRequired
          onConfirm={async (reason, note = "") => {
            await patch({ enabled: !provider.enabled, reason, note })
            toast.success(provider.enabled ? "Switched off" : "Switched on")
          }}
        />
        {hasFields && (
          <ReasonDialog
            trigger="Edit"
            triggerLabel={`Edit ${provider.name}`}
            title={`Edit ${provider.name}?`}
            description="Leave a key empty to keep it."
            confirmLabel="Save"
            noteRequired
            fields={
              <div className="grid gap-3 sm:grid-cols-2">
                <ProviderFields
                  adapter={provider.adapter}
                  settings={settings}
                  secrets={secrets}
                  existing={provider}
                  onSettings={setSettings}
                  onSecrets={setSecrets}
                />
              </div>
            }
            validate={() =>
              providerProblem(
                {
                  adapter: provider.adapter,
                  channel: provider.channel,
                  name: provider.name,
                  settings,
                  secrets,
                },
                provider
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
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`test-${provider.id}`}>Send a test to</Label>
          <Input
            id={`test-${provider.id}`}
            value={to}
            placeholder={
              provider.channel === "email" ? "you@example.com" : "+61412345678"
            }
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={testing || !to.trim()}
          aria-label={`Send a test with ${provider.name}`}
          onClick={async () => {
            setTesting(true)
            try {
              const entry = await api.post<DeliveryLogEntry>(
                `/admin/messaging/providers/${provider.id}/test`,
                { to: to.trim() }
              )
              const last = entry.attempts.at(-1)
              if (entry.status === "sent") toast.success(entry.note ?? "Test sent")
              else toast.error(last?.error ?? entry.note ?? "It didn't send")
              await queryClient.invalidateQueries({ queryKey: [...messagingKey, "log"] })
            } catch (error) {
              toast.error(getErrorMessage(error, "Couldn't send the test."))
            } finally {
              setTesting(false)
            }
          }}
        >
          Send test
        </Button>
      </div>
    </li>
  )
}

function OrderEditor({
  label,
  channel,
  ids,
  providers,
  onChange,
}: {
  label: string
  channel: Channel
  ids: string[]
  providers: MessagingProvider[]
  onChange: (ids: string[]) => void
}) {
  const usable = providers.filter((p) => adapterChannels(p.adapter).includes(channel))
  const where = `${label} ${CHANNEL_LABELS[channel]}`
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {label} · {CHANNEL_LABELS[channel]}
      </span>
      <OrderedIdList
        ids={ids}
        items={providers}
        addable={usable.filter((p) => !ids.includes(p.id))}
        context={where}
        listLabel={`${where} order`}
        addPlaceholder="Choose a provider…"
        selectId={`add-${label}-${channel}`.replace(/\W+/g, "-")}
        emptyText="Nothing — messages are logged as not sent."
        onChange={onChange}
      />
    </div>
  )
}

function Routing({
  data,
  countries,
}: {
  data: AdminMessaging
  countries: CountryProfile[]
}) {
  const queryClient = useQueryClient()
  const [routing, setRouting] = useState<MessagingRouting>(data.routing)
  const [adding, setAdding] = useState("")
  const setCountry = (code: string, order: Partial<ChannelOrder> | null) =>
    setRouting((r) => {
      const next = { ...r.countries }
      if (order) next[code] = order
      else delete next[code]
      return { ...r, countries: next }
    })
  const countryName = (code: string) =>
    countries.find((c) => c.code === code)?.name ?? code
  return (
    <section
      aria-labelledby="routing-heading"
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="routing-heading">
        Order
      </Heading>
      <Text variant="muted" className="text-sm">
        Messages go to the first provider that&apos;s on and fall back to the next if it
        fails. A country&apos;s own order replaces the global one — use it where a
        provider doesn&apos;t reach.
      </Text>
      <div className="grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <OrderEditor
            key={channel}
            label="Global"
            channel={channel}
            ids={routing.global[channel]}
            providers={data.providers}
            onChange={(ids) =>
              setRouting((r) => ({ ...r, global: { ...r.global, [channel]: ids } }))
            }
          />
        ))}
      </div>
      {Object.entries(routing.countries).map(([code, order]) => (
        <fieldset key={code} className="flex flex-col gap-3 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">{countryName(code)}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {CHANNELS.map((channel) =>
              order[channel] ? (
                <OrderEditor
                  key={channel}
                  label={countryName(code)}
                  channel={channel}
                  ids={order[channel]}
                  providers={data.providers}
                  onChange={(ids) => setCountry(code, { ...order, [channel]: ids })}
                />
              ) : (
                <div key={channel} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{CHANNEL_LABELS[channel]}</span>
                  <span className="text-muted-foreground">Uses the global order.</span>
                  <div>
                    <Button
                      variant="outline"
                      size="xs"
                      aria-label={`Set ${countryName(code)}'s own ${CHANNEL_LABELS[channel]} order`}
                      onClick={() =>
                        setCountry(code, {
                          ...order,
                          [channel]: [...routing.global[channel]],
                        })
                      }
                    >
                      Set its own
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Use the global order in ${countryName(code)}`}
              onClick={() => setCountry(code, null)}
            >
              Use the global order here
            </Button>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="routing-country">Give a country its own order</Label>
          <NativeSelect
            id="routing-country"
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
            setCountry(adding, { sms: [...routing.global.sms] })
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
          title="Save the provider order?"
          description="New messages follow it straight away."
          confirmLabel="Save"
          noteRequired
          onConfirm={async (reason, note = "") => {
            queryClient.setQueryData(
              messagingKey,
              await api.put<AdminMessaging>("/admin/messaging/routing", {
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

function DeliveryLog() {
  const [channel, setChannel] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const query = new URLSearchParams({
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
    page: String(page),
  }).toString()
  const { data } = useQuery({
    queryKey: [...messagingKey, "log", query],
    queryFn: ({ signal }) =>
      api.get<Page<DeliveryLogEntry>>(`/admin/messaging/log?${query}`, { signal }),
    placeholderData: keepPreviousData,
  })
  return (
    <section aria-labelledby="log-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="log-heading">
        Delivery log
      </Heading>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-channel">Channel</Label>
          <NativeSelect
            id="log-channel"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-status">Status</Label>
          <NativeSelect
            id="log-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All</option>
            {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {!data ? (
        <Skeleton className="h-32" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nothing sent yet.</Text>
      ) : (
        <ol
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Delivery log"
        >
          {data.items.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 p-3">
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant={entry.status === "failed" ? "destructive" : "outline"}>
                  {DELIVERY_STATUS_LABELS[entry.status]}
                </Badge>
                <span className="font-medium">
                  {CHANNEL_LABELS[entry.channel]} to {entry.to}
                </span>
                <span className="text-muted-foreground">
                  {entry.subject ?? entry.template}
                </span>
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(entry.at)}
                {entry.country && ` · ${entry.country}`}
                {entry.attempts.length > 0 &&
                  ` · ${entry.attempts
                    .map(
                      (a) => `${a.providerName}: ${a.ok ? "sent" : (a.error ?? "failed")}`
                    )
                    .join(" → ")}`}
                {entry.note && ` · ${entry.note}`}
              </span>
            </li>
          ))}
        </ol>
      )}
      {data && data.total > data.pageSize && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Newer
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Older
          </Button>
        </div>
      )}
    </section>
  )
}

function Outbox() {
  const { data } = useQuery({
    queryKey: [...messagingKey, "outbox"],
    queryFn: ({ signal }) =>
      api.get<Page<OutboxMessage>>("/admin/messaging/outbox", { signal }),
  })
  return (
    <section aria-labelledby="outbox-heading" className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id="outbox-heading">
        Test outbox
      </Heading>
      <Text variant="muted" className="text-sm">
        What the Test outbox caught instead of sending — the latest 20.
      </Text>
      {!data ? (
        <Skeleton className="h-32" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Empty.</Text>
      ) : (
        <ol
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Test outbox"
        >
          {data.items.map((m) => (
            <li key={m.id} className="flex flex-col gap-1 p-3">
              <span className="font-medium">
                {CHANNEL_LABELS[m.channel]} to {m.to}
                {m.subject && ` — ${m.subject}`}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(m.at)}
              </span>
              <span className="whitespace-pre-wrap">{m.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Settings › Messaging: email and SMS providers, their order per country, the log and the outbox. */
export function MessagingScreen() {
  usePageTitle("Messaging")
  const { data, error } = useQuery({
    queryKey: messagingKey,
    queryFn: ({ signal }) => api.get<AdminMessaging>("/admin/messaging", { signal }),
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
          <Heading>Messaging</Heading>
          <Text variant="muted">
            Email and SMS providers. Templates (Notification templates) decide the wording
            and each person&apos;s settings decide what they get; login codes always go
            out.
          </Text>
        </div>
        <AddProvider />
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load messaging.")}
        </Text>
      ) : !data || !countries.data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {data.dryRun && (
            <Text role="status" className="bg-muted/50 rounded-md p-3 text-sm">
              Test environment: real providers pretend to send. The Test outbox shows what
              would go out.
            </Text>
          )}
          <section aria-labelledby="providers-heading" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="providers-heading">
              Providers
            </Heading>
            <ul
              className="flex flex-col divide-y rounded-xl border"
              aria-label="Providers"
            >
              {data.providers.map((provider) => (
                <ProviderRow
                  key={`${provider.id}-${data.history[0]?.id ?? ""}`}
                  provider={provider}
                />
              ))}
            </ul>
          </section>
          <Routing
            key={data.history[0]?.id ?? "initial"}
            data={data}
            countries={countries.data}
          />
          <DeliveryLog />
          <Outbox />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
