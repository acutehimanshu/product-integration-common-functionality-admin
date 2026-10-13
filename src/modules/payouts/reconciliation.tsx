import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"
import {
  RECONCILIATION_PROBLEM_LABELS,
  RECONCILIATION_TYPES,
  RECONCILIATION_TYPE_LABELS,
  type AdminReconciliation,
  type ReconciliationException,
} from "@acutehimanshu/core/domain/reconciliation"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { CsvButton } from "@/components/csv-button"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

const reconciliationKey = ["admin", "reconciliation"] as const

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
]
const TYPE_FILTERS = [
  { value: "", label: "Every type" },
  ...RECONCILIATION_TYPES.map((type) => ({
    value: type,
    label: RECONCILIATION_TYPE_LABELS[type],
  })),
]

function Summary({ data }: Readonly<{ data: AdminReconciliation }>) {
  return (
    <dl className="grid gap-2 sm:grid-cols-3" aria-label="Last run">
      {RECONCILIATION_TYPES.map((type) => {
        const { matched, exceptions } = data.summary[type]
        return (
          <div key={type} className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">
              {RECONCILIATION_TYPE_LABELS[type]}s
            </dt>
            <dd className="font-semibold">
              {matched} matched
              {exceptions > 0 && (
                <span className="text-destructive"> · {exceptions} to check</span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function ExceptionRow({ item }: Readonly<{ item: ReconciliationException }>) {
  const queryClient = useQueryClient()
  const amount = (side: ReconciliationException["internal"]) =>
    side ? formatMoney(side.amount) : "—"
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {RECONCILIATION_TYPE_LABELS[item.type]} · {item.key}
          <Badge variant={item.status === "open" ? "destructive" : "outline"}>
            {RECONCILIATION_PROBLEM_LABELS[item.problem]}
          </Badge>
        </span>
        <span className="text-muted-foreground text-xs">
          Ours {amount(item.internal)} · provider {amount(item.provider)} · found{" "}
          {formatDateTime(item.firstSeenAt)}
          {item.resolution &&
            ` · resolved by ${item.resolution.by}: ${item.resolution.reason}`}
        </span>
      </div>
      {item.status === "open" && (
        <ReasonDialog
          trigger="Resolve"
          triggerLabel={`Resolve ${item.key}`}
          title="Resolve this mismatch?"
          description="Say what explains it. It leaves the open queue; the records stay as they are."
          confirmLabel="Resolve"
          noteRequired
          onConfirm={async (reason, note = "") => {
            await api.post(`/admin/reconciliation/exceptions/${item.id}/resolve`, {
              reason,
              note,
            })
            await queryClient.invalidateQueries({ queryKey: reconciliationKey })
            toast.success("Marked as resolved")
          }}
        />
      )}
    </li>
  )
}

/**
 * Reconciliation (FRD-06 PFS-063..065/070): payments, refunds and payouts
 * matched against the payment provider's records; mismatches wait here.
 */
export function Reconciliation() {
  usePageTitle("Reconciliation")
  const [params] = useSearchParams()
  const status =
    STATUS_FILTERS.find((f) => f.value === params.get("status"))?.value ?? "open"
  const type = TYPE_FILTERS.find((f) => f.value === params.get("type"))?.value ?? ""
  const page = Number(params.get("page")) || 1
  const query = new URLSearchParams({ status, ...(type ? { type } : {}) }).toString()
  const { data, isPending, error } = useQuery({
    queryKey: [...reconciliationKey, query, page],
    queryFn: ({ signal }) =>
      api.get<AdminReconciliation>(`/admin/reconciliation?${query}&page=${page}`, {
        signal,
      }),
    placeholderData: keepPreviousData,
  })
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Reconciliation</Heading>
        <Text variant="muted">
          Our payments, refunds and payouts checked against the payment provider&apos;s
          records.
        </Text>
        <Link to="/payouts/ledger" className="text-sm font-medium underline">
          Back to the ledger
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs param="status" options={STATUS_FILTERS} label="Filter by status" />
        <FilterTabs param="type" options={TYPE_FILTERS} label="Filter by type" />
        <CsvButton
          path={`/admin/reconciliation/export?${query}`}
          filename="marketbase-reconciliation.csv"
        />
      </div>
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't run the reconciliation.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-48" />}
      {data && (
        <>
          <Summary data={data} />
          <Text variant="muted" className="text-xs">
            Checked {formatDateTime(data.ranAt)}
          </Text>
          {data.items.length === 0 ? (
            <Text variant="muted">Nothing to check.</Text>
          ) : (
            <ul
              className="flex flex-col divide-y rounded-xl border"
              aria-label="Mismatches"
            >
              {data.items.map((item) => (
                <ExceptionRow key={item.id} item={item} />
              ))}
            </ul>
          )}
          <Pager page={data} />
        </>
      )}
    </PageContainer>
  )
}
