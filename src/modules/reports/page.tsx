import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import {
  SCHEDULE_FREQUENCIES,
  type Report,
  type ReportCell,
  type ReportColumn,
  type ReportId,
  type ReportSchedule,
  type ScheduleFrequency,
} from "@acutehimanshu/core/domain/reports"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { CsvButton } from "@/components/csv-button"
import {
  ExportButtons,
  MyExports,
  ReportNotes,
  SavedViews,
} from "@/modules/reports/report-tools"
import { api, downloadCsv, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { AnalyticsScreen } from "@/modules/reports/analytics"
import { useAdmin } from "@/lib/auth"

type ReportInfo = { id: ReportId; title: string; about: string }

const reportKeys = {
  all: ["admin", "reports"] as const,
  schedules: ["admin", "reports", "schedules"] as const,
}

const FILTERS = ["from", "to", "country", "categoryId", "sellerId", "status"] as const
const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
}

/** One cell as words on screen. */
export function cellLabel(
  cell: ReportCell | undefined,
  kind: ReportColumn["kind"]
): string {
  if (cell === null || cell === undefined || cell === "") return "—"
  if (typeof cell === "object") return formatMoney(cell)
  if (kind === "percent" && typeof cell === "number") return `${cell.toFixed(1)}%`
  if (kind === "date" && typeof cell === "string" && /^\d{4}-\d{2}-\d{2}T/.test(cell))
    return formatDateTime(cell)
  return String(cell)
}

function Schedules({ reports }: { reports: ReportInfo[] }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: reportKeys.schedules,
    queryFn: ({ signal }) =>
      api.get<ReportSchedule[]>("/admin/report-schedules", { signal }),
  })
  const title = (id: ReportId) => reports.find((r) => r.id === id)?.title ?? id
  return (
    <section aria-labelledby="schedules-heading" className="flex flex-col gap-2">
      <Heading as="h2" size="h3" id="schedules-heading">
        Scheduled reports
      </Heading>
      <Text variant="muted" className="text-sm">
        Each run is kept here to download. They&apos;ll be emailed too once an email
        provider is connected.
      </Text>
      {!data || data.length === 0 ? (
        <Text variant="muted" className="text-sm">
          None yet — open a report and choose Schedule.
        </Text>
      ) : (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Scheduled reports"
        >
          {data.map((schedule) => (
            <li key={schedule.id} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex-1 font-medium">
                  {title(schedule.reportId)} · {FREQUENCY_LABELS[schedule.frequency]}
                </span>
                <span className="text-muted-foreground text-xs">
                  Next {formatDateTime(schedule.nextRunAt)} · set up by{" "}
                  {schedule.createdBy.name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Stop ${title(schedule.reportId)} schedule`}
                  onClick={async () => {
                    try {
                      await api.delete(`/admin/report-schedules/${schedule.id}`)
                      queryClient.setQueryData<ReportSchedule[]>(
                        reportKeys.schedules,
                        (old) => old?.filter((s) => s.id !== schedule.id)
                      )
                      toast.success("Schedule stopped")
                    } catch (error) {
                      toast.error(getErrorMessage(error, "Couldn't stop it."))
                    }
                  }}
                >
                  Stop
                </Button>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label="Runs">
                {schedule.runs.map((run) => (
                  <li key={run.id}>
                    <Button
                      variant="link"
                      size="sm"
                      aria-label={`Download ${title(schedule.reportId)} run of ${formatDateTime(run.at)}`}
                      onClick={() =>
                        downloadCsv(
                          `/admin/report-schedules/${schedule.id}/runs/${run.id}/export`,
                          `marketbase-${schedule.reportId}-${run.at.slice(0, 10)}.csv`
                        ).catch((error) =>
                          toast.error(getErrorMessage(error, "Couldn't download it."))
                        )
                      }
                    >
                      {formatDateTime(run.at)} ({run.rowCount} rows)
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ReportList() {
  usePageTitle("Reports")
  const isSuper = useAdmin().data?.isSuperAdmin ?? false
  const { data, error } = useQuery({
    queryKey: reportKeys.all,
    queryFn: ({ signal }) => api.get<ReportInfo[]>("/admin/reports", { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Reports</Heading>
        <Text variant="muted">
          Filter by date, country, category, seller and status; download any report as CSV
          or have it run on a schedule.
        </Text>
        {isSuper && (
          <Link to="analytics" className="text-sm font-medium underline">
            Analytics: funnels, data quality and the event dictionary
          </Link>
        )}
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load reports.")}
        </Text>
      ) : !data ? (
        <Skeleton className="h-40" />
      ) : data.length === 0 ? (
        <Text variant="muted">Your access doesn&apos;t include any reports.</Text>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Reports">
            {data.map((report) => (
              <li key={report.id} className="flex flex-col gap-1 rounded-xl border p-4">
                <Link to={report.id} className="font-medium hover:underline">
                  {report.title}
                </Link>
                <Text variant="muted" className="text-sm">
                  {report.about}
                </Text>
              </li>
            ))}
          </ul>
          <Schedules reports={data} />
          <MyExports />
        </>
      )}
    </PageContainer>
  )
}

function ScheduleButton({ id, filters }: { id: ReportId; filters: string }) {
  const queryClient = useQueryClient()
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly")
  const [recipients, setRecipients] = useState("")
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="schedule-frequency">Schedule</Label>
        <NativeSelect
          id="schedule-frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
        >
          {SCHEDULE_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="schedule-recipients">Email admins (optional)</Label>
        <Input
          id="schedule-recipients"
          placeholder="name@marketbase.com, …"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await api.post("/admin/report-schedules", {
              reportId: id,
              frequency,
              filters: Object.fromEntries(new URLSearchParams(filters)),
              recipients: recipients
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean),
            })
            await queryClient.invalidateQueries({ queryKey: reportKeys.schedules })
            toast.success("Scheduled — the first run is under Reports")
          } catch (error) {
            toast.error(getErrorMessage(error, "Couldn't schedule it."))
          }
        }}
      >
        Schedule
      </Button>
    </div>
  )
}

function ReportView() {
  const { id = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const query = new URLSearchParams(
    FILTERS.flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : []))
  ).toString()
  const { data, error, isFetching } = useQuery({
    queryKey: [...reportKeys.all, id, query],
    queryFn: ({ signal }) =>
      api.get<Report & { maskedColumns?: string[] }>(`/admin/reports/${id}?${query}`, {
        signal,
      }),
    placeholderData: keepPreviousData,
  })
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  usePageTitle(data?.title ?? "Report")
  const setFilter = (key: (typeof FILTERS)[number], value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }
  return (
    <PageContainer maxWidth="6xl">
      <Link to="/reports" className="text-muted-foreground text-sm hover:underline">
        ← Reports
      </Link>
      <div className="flex flex-wrap items-end gap-3">
        <Heading className="flex-1">{data?.title ?? "Report"}</Heading>
        <CsvButton
          path={`/admin/reports/${id}/export?${query}`}
          filename={`marketbase-${id}.csv`}
        />
        <ExportButtons id={id as ReportId} query={query} />
        <ScheduleButton id={id as ReportId} filters={query} />
      </div>
      <SavedViews id={id as ReportId} query={query} />
      <fieldset className="grid gap-3 sm:grid-cols-6">
        <legend className="mb-1 text-sm font-medium">Filters</legend>
        {(
          [
            ["from", "From", "date"],
            ["to", "To", "date"],
            ["country", "Country", "text"],
            ["sellerId", "Seller ID", "text"],
            ["status", "Status", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`report-${key}`}>{label}</Label>
            <Input
              id={`report-${key}`}
              type={type}
              defaultValue={params.get(key) ?? ""}
              onBlur={(e) => setFilter(key, e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter") setFilter(key, e.currentTarget.value.trim())
              }}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-category">Category</Label>
          <NativeSelect
            id="report-category"
            value={params.get("categoryId") ?? ""}
            onChange={(e) => setFilter("categoryId", e.target.value)}
          >
            <option value="">Any</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </fieldset>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't run this report.")}
        </Text>
      ) : !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Text variant="muted" className="text-sm" aria-live="polite">
            {isFetching
              ? "Updating…"
              : `${data.rows.length} rows · run ${formatDateTime(data.generatedAt)}`}
          </Text>
          <ReportNotes
            maskedColumns={data.maskedColumns}
            estimated={data.columns.filter((c) => c.estimated).map((c) => c.label)}
          />
          {/* Focusable so keyboard users can scroll a wide report sideways. */}
          <div
            className="overflow-x-auto rounded-xl border"
            role="region"
            aria-label={`${data.title} table, scrolls sideways`}
            tabIndex={0}
          >
            <table className="w-full text-left text-sm" aria-label={data.title}>
              <thead className="bg-muted/40">
                <tr>
                  {data.columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="p-2 font-medium whitespace-nowrap"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.columns.length}
                      className="text-muted-foreground p-3"
                    >
                      Nothing matches these filters.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, index) => (
                    <tr key={index} className="border-t">
                      {data.columns.map((column) => (
                        <td key={column.key} className="p-2 whitespace-nowrap">
                          {cellLabel(row[column.key], column.kind)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {data.totals && (
                <tfoot className="border-t font-medium">
                  <tr>
                    {data.columns.map((column) => (
                      <td key={column.key} className="p-2 whitespace-nowrap">
                        {data.totals![column.key] === undefined
                          ? ""
                          : cellLabel(data.totals![column.key], column.kind)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </PageContainer>
  )
}

/** Reports: six reports with filters, CSV and schedules. */
export default function ReportsPage() {
  return (
    <Routes>
      <Route index element={<ReportList />} />
      <Route path="analytics" element={<AnalyticsScreen />} />
      <Route path=":id" element={<ReportView />} />
    </Routes>
  )
}
