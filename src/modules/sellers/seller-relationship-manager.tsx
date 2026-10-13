import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  AdminSellerDetail,
  RelationshipManagerOption,
} from "@acutehimanshu/core/domain/admin-sellers"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Text } from "@acutehimanshu/ui/components/text"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { sellerKeys } from "@/modules/sellers/api"

/**
 * The seller's relationship manager (FRD-03 03-029/030): assign, hand over or
 * remove one, with every change kept below.
 */
export function SellerRelationshipManager({
  seller,
}: Readonly<{ seller: AdminSellerDetail }>) {
  const queryClient = useQueryClient()
  const rm = seller.relationshipManager
  const path = `/admin/sellers/${encodeURIComponent(seller.userId)}`
  const { data: options = [] } = useQuery({
    queryKey: [...sellerKeys.detail(seller.userId), "relationship-managers"],
    queryFn: ({ signal }) =>
      api.get<RelationshipManagerOption[]>(`${path}/relationship-managers`, { signal }),
    enabled: rm.eligible,
  })
  const [choice, setChoice] = useState("")
  const save = (adminId: string | null) => async (reason: string) => {
    const updated = await api.post<AdminSellerDetail>(`${path}/relationship-manager`, {
      adminId,
      reason,
    })
    queryClient.setQueryData(sellerKeys.detail(seller.userId), updated)
    setChoice("")
    toast.success(adminId ? "Relationship manager saved" : "Relationship manager removed")
  }
  const others = options.filter((o) => o.adminId !== rm.current?.adminId)

  return (
    <Card>
      <CardHeader>
        <Heading as="h2" size="h3">
          Relationship manager
        </Heading>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          {rm.current
            ? `${rm.current.name}, since ${formatDateTime(rm.current.since)}`
            : "No one assigned."}
        </p>
        {!rm.eligible && (
          <Text variant="muted" className="text-sm">
            {rm.current
              ? "Their package no longer includes a relationship manager, so they don't see one. Remove or keep the assignment for when they upgrade."
              : "Their package doesn't include a relationship manager."}
          </Text>
        )}
        <div className="flex flex-wrap gap-2">
          {rm.eligible && (
            <ReasonDialog
              trigger={rm.current ? "Hand over" : "Assign"}
              title={
                rm.current
                  ? `Hand ${seller.shopName} to someone else?`
                  : `Assign a relationship manager to ${seller.shopName}?`
              }
              description="The seller is told the name. Contact stays through support."
              confirmLabel="Save"
              fields={
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rm-admin">Admin</Label>
                  <NativeSelect
                    id="rm-admin"
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                  >
                    <option value="">Choose an admin…</option>
                    {others.map((o) => (
                      <option key={o.adminId} value={o.adminId}>
                        {o.name} ({o.sellers} {o.sellers === 1 ? "seller" : "sellers"})
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              }
              validate={() => (choice ? null : "Choose an admin")}
              onConfirm={save(choice)}
            />
          )}
          {rm.current && (
            <ReasonDialog
              trigger="Remove"
              triggerVariant="outline"
              triggerLabel={`Remove ${rm.current.name}`}
              title={`Remove ${rm.current.name} as relationship manager?`}
              description="The seller stops seeing a relationship manager."
              confirmLabel="Remove"
              onConfirm={save(null)}
            />
          )}
        </div>
        {rm.history.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label="Relationship manager history">
            {rm.history.map((change) => (
              <li key={change.at} className="text-muted-foreground">
                {formatDateTime(change.at)} — {change.name ?? "Removed"} (by {change.by}:{" "}
                {change.reason})
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
