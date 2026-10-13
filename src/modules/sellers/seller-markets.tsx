import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminSellerDetail } from "@acutehimanshu/core/domain/admin-sellers"
import { MARKET_STATUS_LABELS } from "@acutehimanshu/core/domain/seller"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { sellerKeys } from "@/modules/sellers/api"

/** Where the seller sells, and their requests to sell abroad (FRD-03 03-005). */
export function SellerMarkets({ seller }: Readonly<{ seller: AdminSellerDetail }>) {
  const queryClient = useQueryClient()
  const decide =
    (country: string, decision: "approve" | "restrict") => async (reason: string) => {
      const updated = await api.post<AdminSellerDetail>(
        `/admin/sellers/${encodeURIComponent(seller.userId)}/markets/${country}`,
        { decision, reason }
      )
      queryClient.setQueryData(sellerKeys.detail(seller.userId), updated)
      toast.success(decision === "approve" ? "Approved" : "Restricted")
    }
  return (
    <Card>
      <CardHeader>
        <Heading as="h2" size="h3">
          Where they sell
        </Heading>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm" aria-label="Selling countries">
          {seller.markets
            .filter((market) => market.status !== "withdrawn")
            .map((market) => (
              <li key={market.country} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{market.country}</span>
                <span className="text-muted-foreground">
                  {market.home ? "Home country" : MARKET_STATUS_LABELS[market.status]}
                  {market.requestedAt && ` · asked ${formatDateTime(market.requestedAt)}`}
                </span>
                {!market.home && market.status !== "active" && (
                  <ReasonDialog
                    trigger="Approve"
                    triggerLabel={`Approve selling in ${market.country}`}
                    title={`Let ${seller.shopName} sell in ${market.country}?`}
                    description="Their listings can then be offered to buyers there."
                    confirmLabel="Approve"
                    onConfirm={decide(market.country, "approve")}
                  />
                )}
                {!market.home && market.status !== "restricted" && (
                  <ReasonDialog
                    trigger="Restrict"
                    triggerVariant="outline"
                    triggerLabel={`Restrict selling in ${market.country}`}
                    title={`Stop ${seller.shopName} selling in ${market.country}?`}
                    description="The seller sees your reason."
                    confirmLabel="Restrict"
                    onConfirm={decide(market.country, "restrict")}
                  />
                )}
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  )
}
