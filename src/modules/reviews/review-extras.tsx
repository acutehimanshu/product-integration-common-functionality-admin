import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminReviewRow } from "@acutehimanshu/core/domain/admin-reviews"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { ReviewDetails } from "@acutehimanshu/ui/components/review-details"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { reviewKeys } from "@/modules/reviews/keys"

/**
 * The newer parts of a review in moderation (FRD-07 RVW-057..069): items,
 * dimensions and photos; approving a pre-moderated one; and the seller's
 * answer, which Marketbase can hide or restore.
 */
export function ReviewExtras({ row }: Readonly<{ row: AdminReviewRow }>) {
  const queryClient = useQueryClient()
  const post = async (path: string, reason: string, done: string) => {
    await api.post(`/admin/reviews/${encodeURIComponent(row.id)}/${path}`, { reason })
    await queryClient.invalidateQueries({ queryKey: reviewKeys.all })
    toast.success(done)
  }
  const response = row.response
  return (
    <div className="flex flex-col gap-2">
      <ReviewDetails review={{ ...row, response: undefined }} />
      {row.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Waiting for approval</Badge>
          <ReasonDialog
            trigger="Publish"
            title="Publish this review?"
            description="It goes on the seller's page and counts in their rating."
            confirmLabel="Publish"
            onConfirm={(reason) => post("approve", reason, "Review published")}
          />
        </div>
      )}
      {response && (
        <div className="flex flex-col gap-1 border-l-2 pl-3">
          <p>
            <span className="font-medium">Seller&apos;s answer:</span> {response.text}
          </p>
          {response.hidden && (
            <p className="text-muted-foreground">Hidden: {response.hidden.reason}</p>
          )}
          <div>
            {response.hidden ? (
              <ReasonDialog
                trigger="Restore answer"
                title="Restore the seller's answer?"
                description="It shows under the review again."
                confirmLabel="Restore"
                onConfirm={(reason) =>
                  post("response/restore", reason, "Answer restored")
                }
              />
            ) : (
              <ReasonDialog
                trigger="Hide answer"
                title="Hide the seller's answer?"
                description="It leaves the shop page; the review stays."
                confirmLabel="Hide answer"
                destructive
                onConfirm={(reason) => post("response/hide", reason, "Answer hidden")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
