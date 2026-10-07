import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import {
  MODERATION_ACTION_LABELS,
  REPORT_REASON_LABELS,
  type ModerationAction,
} from "@acutehimanshu/core/domain/admin-moderation"
import { LISTING_STATUS_LABELS } from "@acutehimanshu/core/domain/listings"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { getReported, moderate, moderationKeys } from "@/modules/listings/api"

export function ModerationReview() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const {
    data: item,
    isPending,
    error,
  } = useQuery({
    queryKey: moderationKeys.detail(id),
    queryFn: ({ signal }) => getReported(id, { signal }),
  })
  usePageTitle(item ? item.title : "Listing moderation")

  const act =
    (action: ModerationAction) => async (reason: string, note: string | undefined) => {
      await moderate(id, { action, reason, note })
      await queryClient.invalidateQueries({ queryKey: moderationKeys.all })
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      toast.success(MODERATION_ACTION_LABELS[action])
    }

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Listing moderation
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this listing.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{item.title}</Heading>
            <Badge variant="outline">{LISTING_STATUS_LABELS[item.listingStatus]}</Badge>
          </div>
          <Text variant="muted">
            {item.shopName} · {formatMoney(item.listing.price)} ·{" "}
            {item.listing.stock.available} in stock
          </Text>

          {item.state === "open" ? (
            <div className="flex flex-wrap gap-2">
              <ReasonDialog
                trigger="Take down"
                triggerVariant="destructive"
                title="Take this listing down?"
                description="It's removed from sale for good; the seller can't bring it back."
                reasonHint="The seller sees this."
                confirmLabel="Take down"
                destructive
                noteRequired
                onConfirm={act("take_down")}
              />
              <ReasonDialog
                trigger="Ask the seller to fix"
                title="Ask the seller to fix it"
                description="It's paused until the seller edits it."
                reasonLabel="What needs fixing?"
                reasonHint="The seller sees this."
                confirmLabel="Send to seller"
                onConfirm={act("ask_to_fix")}
              />
              <ReasonDialog
                trigger="Dismiss reports"
                title="Dismiss these reports?"
                description="The listing stays as it is. A new report reopens it."
                reasonLabel="Why are the reports wrong?"
                confirmLabel="Dismiss"
                onConfirm={act("dismiss")}
              />
            </div>
          ) : (
            <Text>
              Resolved:{" "}
              <strong>{item.outcome && MODERATION_ACTION_LABELS[item.outcome]}</strong>
            </Text>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Reports ({item.reports.length})
                </Heading>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3 text-sm">
                  {item.reports.map((report, index) => (
                    <li key={index} className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {REPORT_REASON_LABELS[report.reason]}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {report.source === "rule" ? "automatic rule" : "buyer"} ·{" "}
                          {formatDateTime(report.at)}
                        </span>
                      </span>
                      {report.note && <span>“{report.note}”</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Listing
                </Heading>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {item.listing.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {item.listing.photos.map((photo) => (
                      <img
                        key={photo}
                        src={photo}
                        alt=""
                        className="bg-muted size-20 shrink-0 rounded-md object-cover"
                      />
                    ))}
                  </div>
                )}
                {item.listing.description && <p>{item.listing.description}</p>}
                {item.listing.details.length > 0 && (
                  <dl className="grid grid-cols-3 gap-1">
                    {item.listing.details.map((detail) => (
                      <div key={detail.label} className="contents">
                        <dt className="text-muted-foreground">{detail.label}</dt>
                        <dd className="col-span-2">{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>

          <AuditHistory entries={item.history} />
        </>
      )}
    </PageContainer>
  )
}
