import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"
import {
  LEDGER_ACCOUNT_LABELS,
  LEDGER_KINDS,
  LEDGER_KIND_LABELS,
  type AdminLedger,
  type LedgerTotals,
} from "@acutehimanshu/core/domain/ledger"
import { formatMoney, toMinorUnits } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { CsvButton } from "@/components/csv-button"
import { Pager } from "@/components/pager"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

const ledgerKey = ["admin", "ledger"] as const
const FILTERS = ["kind", "sellerId", "orderId", "from", "to"] as const

/** "12.50" / "-3" typed by an admin → signed minor units, or null if it isn't a number. */
export function parseAdjustment(text: string, currency: string): number | null {
  const value = Number(text.trim())
  if (!text.trim() || !Number.isFinite(value) || value === 0) return null
  return toMinorUnits(value, currency)
}

function Totals({ totals }: { totals: LedgerTotals }) {
  const rows: Array<[string, string]> = [
    ["Paid in by buyers", formatMoney(totals.paidIn)],
    ["Owed to sellers", formatMoney(totals.owedToSellers)],
    ["Platform fees", formatMoney(totals.platformFees)],
    ["Tax collected", formatMoney(totals.taxCollected)],
    ["Delivery charges", formatMoney(totals.shippingCollected)],
    ["Refunds paid", formatMoney(totals.refundsPaid)],
    ["Payouts paid", formatMoney(totals.payoutsPaid)],
    [
      `Held (${totals.held.sellers} ${totals.held.sellers === 1 ? "seller" : "sellers"})`,
      formatMoney(totals.held.amount),
    ],
  ]
  const balanced = totals.difference.amount === 0
  return (
    <section aria-labelledby="ledger-totals" className="flex flex-col gap-2">
      <Heading as="h2" size="h3" id="ledger-totals">
        Reconciliation
      </Heading>
      <dl className="grid gap-2 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <Text
        className={balanced ? "text-sm" : "text-destructive text-sm font-medium"}
        role="status"
      >
        {balanced
          ? "The books balance: everything paid in is accounted for."
          : `The books are out by ${formatMoney(totals.difference)} — check recent entries.`}
      </Text>
    </section>
  )
}

function Adjust({ currency }: { currency: string }) {
  const queryClient = useQueryClient()
  const [sellerId, setSellerId] = useState("")
  const [orderId, setOrderId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  return (
    <ReasonDialog
      trigger="Manual adjustment"
      title="Make a manual adjustment?"
      description="A new ledger entry: a positive amount credits the seller, a negative one takes it back. It can be reversed, never edited."
      confirmLabel="Add adjustment"
      noteRequired
      fields={
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-seller">Seller ID</Label>
            <Input
              id="adj-seller"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-order">Order (optional)</Label>
            <Input
              id="adj-order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-amount">Amount ({currency}, + or −)</Label>
            <Input
              id="adj-amount"
              inputMode="decimal"
              value={amount}
              placeholder="e.g. 12.50 or -5"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-description">What it's for</Label>
            <Input
              id="adj-description"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      }
      validate={() =>
        !sellerId.trim()
          ? "Enter the seller ID."
          : parseAdjustment(amount, currency) === null
            ? "Enter an amount other than 0, e.g. 12.50 or -5."
            : description.trim().length < 3
              ? "Say what it's for."
              : null
      }
      onConfirm={async (reason, note = "") => {
        await api.post("/admin/ledger/adjustments", {
          sellerId: sellerId.trim(),
          ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
          amount: parseAdjustment(amount, currency),
          description: description.trim(),
          reason,
          note,
        })
        await queryClient.invalidateQueries({ queryKey: ledgerKey })
        setAmount("")
        setDescription("")
        toast.success("Adjustment added")
      }}
    />
  )
}

/** Payouts › Ledger: every money event, reconciliation and manual adjustments (finance). */
export function Ledger() {
  usePageTitle("Ledger")
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  const { data, error, isPending } = useQuery({
    queryKey: [...ledgerKey, query],
    queryFn: ({ signal }) => api.get<AdminLedger>(`/admin/ledger?${query}`, { signal }),
    placeholderData: keepPreviousData,
  })
  const setFilter = (key: (typeof FILTERS)[number], value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete("page")
    setParams(next)
  }
  const exportQuery = new URLSearchParams(
    FILTERS.flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : []))
  ).toString()

  return (
    <PageContainer maxWidth="6xl">
      <Link to="/payouts" className="text-muted-foreground text-sm hover:underline">
        ← Payouts
      </Link>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Heading>Ledger</Heading>
          <Text variant="muted">
            Every confirmed money event, newest first. Entries are never changed — a
            correction is a new entry.
          </Text>
        </div>
        <CsvButton
          path={`/admin/ledger/export?${exportQuery}`}
          filename="marketbase-ledger.csv"
        />
        {data && <Adjust currency={data.totals.currency} />}
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the ledger.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Totals totals={data.totals} />
          <fieldset className="grid gap-3 sm:grid-cols-5">
            <legend className="sr-only">Filter the ledger</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ledger-kind">Event</Label>
              <NativeSelect
                id="ledger-kind"
                value={params.get("kind") ?? ""}
                onChange={(e) => setFilter("kind", e.target.value)}
              >
                <option value="">All</option>
                {LEDGER_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LEDGER_KIND_LABELS[k]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {(
              [
                ["sellerId", "Seller ID", "text"],
                ["orderId", "Order", "text"],
                ["from", "From", "date"],
                ["to", "To", "date"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={`ledger-${key}`}>{label}</Label>
                <Input
                  id={`ledger-${key}`}
                  type={type}
                  defaultValue={params.get(key) ?? ""}
                  onBlur={(e) => setFilter(key, e.target.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setFilter(key, e.currentTarget.value.trim())
                  }}
                />
              </div>
            ))}
          </fieldset>
          {data.items.length === 0 ? (
            <Text variant="muted">No entries match.</Text>
          ) : (
            <ol
              className="flex flex-col divide-y rounded-xl border text-sm"
              aria-label="Ledger entries"
            >
              {data.items.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">
                      {LEDGER_KIND_LABELS[entry.kind]} · {formatMoney(entry.amount)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(entry.at)} · {LEDGER_ACCOUNT_LABELS[entry.from]} →{" "}
                      {LEDGER_ACCOUNT_LABELS[entry.to]} · {entry.description}
                      {entry.by && ` · ${entry.by.name}: “${entry.reason}”`}
                    </span>
                  </span>
                  {entry.sellerBalance && (
                    <span className="text-muted-foreground text-xs">
                      Seller balance {formatMoney(entry.sellerBalance)}
                    </span>
                  )}
                  {entry.kind === "adjustment" &&
                    !data.items.some((e) => e.reverses === entry.id) && (
                      <ReasonDialog
                        trigger="Reverse"
                        triggerLabel={`Reverse ${entry.description}`}
                        title="Reverse this adjustment?"
                        description="Adds an entry that cancels it. The original stays in the ledger."
                        confirmLabel="Reverse"
                        noteRequired
                        onConfirm={async (reason, note = "") => {
                          await api.post(`/admin/ledger/${entry.id}/reverse`, {
                            reason,
                            note,
                          })
                          await queryClient.invalidateQueries({ queryKey: ledgerKey })
                          toast.success("Adjustment reversed")
                        }}
                      />
                    )}
                </li>
              ))}
            </ol>
          )}
          <Pager page={data} />
        </>
      )}
    </PageContainer>
  )
}
