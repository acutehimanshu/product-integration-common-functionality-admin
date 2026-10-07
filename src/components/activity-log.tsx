import { textField } from "@/lib/form-data"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import {
  ACTIVITY_KIND_LABELS,
  ACTIVITY_KINDS,
  ACTIVITY_RETENTION_DAYS,
  type ActivityEntry,
} from "@acutehimanshu/core/domain/admin-activity"
import type { AdminAccount } from "@acutehimanshu/core/domain/admin-content"
import type { Page } from "@acutehimanshu/core/types/page"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Text } from "@acutehimanshu/ui/components/text"
import { Pager } from "@/components/pager"
import { api, getErrorMessage } from "@/lib/api"
import { ChangeList } from "@/components/change-list"
import { formatDateTime } from "@/lib/format"

const TONE: Partial<
  Record<ActivityEntry["kind"], "destructive" | "secondary" | "outline">
> = {
  login_failed: "destructive",
  delete: "destructive",
  login: "secondary",
  logout: "secondary",
  session_ended: "secondary",
}

/** Entries in order, with a divider each time a new session starts. */
function Entries({ entries }: { entries: ActivityEntry[] }) {
  return (
    <ol aria-label="Activity" className="flex flex-col rounded-xl border text-sm">
      {entries.map((entry, i) => {
        const newSession = entry.sessionId !== entries[i - 1]?.sessionId
        return (
          <li
            key={entry.id}
            className={newSession && i > 0 ? "border-t-4" : "border-t first:border-t-0"}
          >
            <div className="flex flex-col gap-0.5 p-3">
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant={TONE[entry.kind] ?? "outline"}>
                  {ACTIVITY_KIND_LABELS[entry.kind]}
                </Badge>
                <span className="font-medium">
                  {entry.admin?.name ?? entry.email ?? "Unknown"}
                </span>
                <span className="min-w-0 flex-1">{entry.summary}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(entry.at)}
                {entry.reason && ` · Reason: “${entry.reason}”`}
                {(entry.kind === "login" || entry.kind === "login_failed") &&
                  [entry.device, entry.ip].filter(Boolean).length > 0 &&
                  ` · ${[entry.device, entry.ip].filter(Boolean).join(" · ")}`}
                {entry.sessionId && ` · Session ${entry.sessionId}`}
              </span>
              {entry.note && (
                <span className="text-xs whitespace-pre-wrap">
                  <span className="font-medium">Internal note:</span> {entry.note}
                </span>
              )}
              <ChangeList changes={entry.changes} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The activity log with its filters (kept in the URL). Pass `adminId` to fix
 * it to one admin (their page); otherwise there's an admin filter.
 */
export function ActivityLog({ adminId }: { adminId?: string }) {
  const [params, setParams] = useSearchParams()
  const filter = {
    adminId: adminId ?? params.get("adminId") ?? "",
    kind: params.get("kind") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    q: params.get("q") ?? "",
    sessionId: params.get("sessionId") ?? "",
    page: params.get("page") ?? "1",
  }
  const admins = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: ({ signal }) => api.get<AdminAccount[]>("/admin/admins", { signal }),
    enabled: !adminId,
  })
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "activity", filter],
    queryFn: ({ signal }) => {
      const search = new URLSearchParams(
        Object.entries(filter).filter(([, value]) => value !== "")
      )
      return api.get<Page<ActivityEntry>>(`/admin/activity?${search}`, { signal })
    },
  })

  const set = (key: string, value: string) =>
    setParams(
      (current) => {
        if (value) current.set(key, value)
        else current.delete(key)
        current.delete("page")
        return current
      },
      { replace: true }
    )

  return (
    <section aria-label="Activity log" className="flex flex-col gap-3">
      <form
        role="search"
        aria-label="Filter activity"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault()
          set("q", textField(new FormData(e.currentTarget), "q"))
        }}
      >
        {!adminId && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="activity-admin">Admin</Label>
            <NativeSelect
              id="activity-admin"
              value={filter.adminId}
              onChange={(e) => set("adminId", e.target.value)}
            >
              <option value="">Everyone</option>
              {admins.data?.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="activity-kind">What</Label>
          <NativeSelect
            id="activity-kind"
            value={filter.kind}
            onChange={(e) => set("kind", e.target.value)}
          >
            <option value="">Everything</option>
            {ACTIVITY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ACTIVITY_KIND_LABELS[kind]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="activity-from">From</Label>
          <Input
            id="activity-from"
            type="date"
            value={filter.from}
            onChange={(e) => set("from", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="activity-to">To</Label>
          <Input
            id="activity-to"
            type="date"
            value={filter.to}
            onChange={(e) => set("to", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="activity-q">Search</Label>
          <div className="flex gap-1">
            <Input
              id="activity-q"
              name="q"
              defaultValue={filter.q}
              placeholder="Record, reason…"
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </div>
      </form>
      {filter.sessionId && (
        <Text className="text-sm">
          One session ({filter.sessionId}).{" "}
          <button
            type="button"
            className="underline"
            onClick={() => set("sessionId", "")}
          >
            Show all
          </button>
        </Text>
      )}
      <Text variant="muted" className="text-xs">
        Everything from login to logout, newest first. Kept for {ACTIVITY_RETENTION_DAYS}{" "}
        days; nobody can edit or delete it.
      </Text>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the activity log.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nothing matches.</Text>
      ) : (
        <>
          <Entries entries={data.items} />
          <Pager page={data} />
        </>
      )}
    </section>
  )
}
