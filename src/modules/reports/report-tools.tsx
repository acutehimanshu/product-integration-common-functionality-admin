import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  REPORT_INFO,
  type ExportFormat,
  type ExportJob,
  type ReportId,
  type ReportView,
} from "@acutehimanshu/core/domain/reports"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { api, downloadCsv, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

// Report extras (FRD-09 RPT-004..008, RPT-014): Excel, background exports,
// saved views.

const exportsKey = ["admin", "reports", "exports"] as const
const viewsKey = ["admin", "reports", "views"] as const

const JOB_STATUS: Record<ExportJob["status"], string> = {
  queued: "Being made",
  ready: "Ready",
  expired: "Expired",
}

/** Excel now, or an export that's kept for download (large ones are made in the background). */
export function ExportButtons({ id, query }: Readonly<{ id: ReportId; query: string }>) {
  const queryClient = useQueryClient()
  const make = async (format: ExportFormat) => {
    try {
      const job = await api.post<ExportJob>(`/admin/reports/${id}/exports`, {
        format,
        filters: Object.fromEntries(new URLSearchParams(query)),
      })
      await queryClient.invalidateQueries({ queryKey: exportsKey })
      toast.success(
        job.status === "ready"
          ? "Export ready under Reports › Your exports"
          : "Being made — it'll be under Reports › Your exports"
      )
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't export it."))
    }
  }
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          downloadCsv(
            `/admin/reports/${id}/export?${query}&format=xlsx`,
            `marketbase-${id}.xlsx`
          ).catch((error: unknown) =>
            toast.error(getErrorMessage(error, "Couldn't download it."))
          )
        }
      >
        Download Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => make("xlsx")}>
        Keep an export
      </Button>
    </div>
  )
}

/** Exports they made: ready, being made or expired (files are kept 7 days). */
export function MyExports() {
  const { data } = useQuery({
    queryKey: exportsKey,
    queryFn: ({ signal }) => api.get<ExportJob[]>("/admin/exports", { signal }),
  })
  if (!data || data.length === 0) return null
  return (
    <section className="flex flex-col gap-2 text-sm" aria-labelledby="exports-heading">
      <Heading as="h2" size="h3" id="exports-heading">
        Your exports
      </Heading>
      <ul className="flex flex-col divide-y rounded-xl border">
        {data.map((job) => (
          <li key={job.id} className="flex flex-wrap items-center gap-2 p-2">
            <span className="flex-1">
              {REPORT_INFO[job.reportId].title} · {job.format.toUpperCase()} ·{" "}
              {job.rowCount} rows · {formatDateTime(job.createdAt)}
              {job.maskedColumns.length > 0 &&
                ` · hidden: ${job.maskedColumns.join(", ")}`}
            </span>
            <Badge variant="outline">{JOB_STATUS[job.status]}</Badge>
            {job.status === "ready" && (
              <Button
                size="xs"
                variant="ghost"
                aria-label={`Download ${REPORT_INFO[job.reportId].title} export`}
                onClick={() =>
                  downloadCsv(
                    `/admin/exports/${job.id}/download`,
                    `marketbase-${job.reportId}.${job.format}`
                  ).catch((error: unknown) =>
                    toast.error(getErrorMessage(error, "Couldn't download it."))
                  )
                }
              >
                Download
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Saved filters for this report, theirs and shared ones (RPT-007). */
export function SavedViews({ id, query }: Readonly<{ id: ReportId; query: string }>) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: viewsKey,
    queryFn: ({ signal }) => api.get<ReportView[]>("/admin/report-views", { signal }),
  })
  const [name, setName] = useState("")
  const [shared, setShared] = useState(false)
  const mine = (data ?? []).filter((v) => v.reportId === id)
  return (
    <div className="flex flex-col gap-2 text-sm">
      {mine.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Saved views">
          <span className="text-muted-foreground">Saved views:</span>
          {mine.map((v) => (
            <Link
              key={v.id}
              to={`?${new URLSearchParams(Object.entries(v.filters).filter((e): e is [string, string] => !!e[1])).toString()}`}
              className="underline"
            >
              {v.name}
              {v.shared && " (shared)"}
            </Link>
          ))}
        </div>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (event: React.SyntheticEvent<HTMLFormElement>) => {
          event.preventDefault()
          try {
            await api.post("/admin/report-views", {
              name,
              reportId: id,
              filters: Object.fromEntries(new URLSearchParams(query)),
              shared,
            })
            setName("")
            await queryClient.invalidateQueries({ queryKey: viewsKey })
            toast.success("View saved")
          } catch (error) {
            toast.error(getErrorMessage(error, "Couldn't save the view."))
          }
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="view-name">Save these filters as</Label>
          <Input id="view-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          Share with the team
        </label>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={name.trim().length < 2}
        >
          Save view
        </Button>
      </form>
    </div>
  )
}

/** Hidden personal columns and estimated figures, said plainly above the table. */
export function ReportNotes({
  maskedColumns,
  estimated,
}: Readonly<{ maskedColumns?: string[]; estimated: string[] }>) {
  return (
    <>
      {maskedColumns && maskedColumns.length > 0 && (
        <Text variant="muted" className="text-sm">
          Hidden for you: {maskedColumns.join(", ")} (personal details your access
          doesn&apos;t include).
        </Text>
      )}
      {estimated.length > 0 && (
        <Text variant="muted" className="text-sm">
          {estimated.join(" and ")} are estimates from last-touch attribution (7 days) —
          not booked money.
        </Text>
      )}
    </>
  )
}
