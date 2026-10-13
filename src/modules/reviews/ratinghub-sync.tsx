import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RATINGHUB_SYNC_STATUSES,
  RATINGHUB_SYNC_STATUS_LABELS,
  type AdminRatingHub,
} from "@acutehimanshu/core/domain/ratinghub"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

const key = ["admin", "ratinghub"] as const

/** What went to RatingHub, what's waiting and what failed (FRD-09 RAT-006/007). */
export function RatingHubSync() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<AdminRatingHub>("/admin/ratinghub", { signal }),
  })
  if (!data) return null
  return (
    <section className="flex flex-col gap-2 text-sm" aria-labelledby="ratinghub-heading">
      <Heading as="h2" size="h3" id="ratinghub-heading">
        RatingHub sync
      </Heading>
      <Text variant="muted">
        {data.enabled
          ? `On — published reviews go to ${data.adapter} (first name only). Hidden ones are taken back.`
          : "Off — turn it on in Settings › Reviews once the RatingHub contract is in place."}
      </Text>
      <div className="flex flex-wrap gap-2">
        {RATINGHUB_SYNC_STATUSES.map((s) => (
          <Badge
            key={s}
            variant={s === "failed" && data.counts.failed > 0 ? "destructive" : "outline"}
          >
            {RATINGHUB_SYNC_STATUS_LABELS[s]}: {data.counts[s]}
          </Badge>
        ))}
      </div>
      {data.entries.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-xl border"
          aria-label="RatingHub sync entries"
        >
          {data.entries.slice(0, 30).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 p-2">
              <span className="flex-1">
                {e.action === "publish" ? "Send" : "Take back"} review {e.reviewId}{" "}
                (version {e.version}) · {e.attempts} tries
                {e.lastAttemptAt && ` · last ${formatDateTime(e.lastAttemptAt)}`}
                {e.externalRef && ` · RatingHub ${e.externalRef}`}
                {e.lastError && ` · ${e.lastError}`}
              </span>
              <Badge variant={e.status === "failed" ? "destructive" : "outline"}>
                {RATINGHUB_SYNC_STATUS_LABELS[e.status]}
              </Badge>
              {e.status === "failed" && (
                <ReasonDialog
                  trigger="Retry"
                  triggerLabel={`Retry review ${e.reviewId}`}
                  title="Send it again?"
                  description="It goes to RatingHub now with the same id and version, so it can't arrive twice."
                  confirmLabel="Retry"
                  onConfirm={async (reason) => {
                    await api.post(`/admin/ratinghub/${encodeURIComponent(e.id)}/retry`, {
                      reason,
                    })
                    await queryClient.invalidateQueries({ queryKey: key })
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
