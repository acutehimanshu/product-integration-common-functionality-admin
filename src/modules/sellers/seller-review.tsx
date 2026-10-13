import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import {
  SELLER_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@acutehimanshu/core/domain/seller"
import type {
  AdminSellerDetail,
  PartnerCheck,
  SellerDecision,
} from "@acutehimanshu/core/domain/admin-sellers"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { InternalNotes } from "@/components/internal-notes"
import { VerificationCase } from "@/modules/sellers/verification-case"
import { SellerMarkets } from "@/modules/sellers/seller-markets"
import { SellerRelationshipManager } from "@/modules/sellers/seller-relationship-manager"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { useAdmin } from "@/lib/auth"
import { canUseModule } from "@/modules"
import { decideSeller, getSeller, sellerKeys } from "@/modules/sellers/api"

const CHECK_LABELS: Record<PartnerCheck, string> = {
  passed: "Passed",
  failed: "Failed",
  unclear: "Needs a person",
  not_run: "Not needed",
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  )
}

export function SellerReview() {
  const { id = "" } = useParams()
  const { data: admin } = useAdmin()
  const queryClient = useQueryClient()
  const {
    data: seller,
    isPending,
    error,
  } = useQuery({
    queryKey: sellerKeys.detail(id),
    queryFn: ({ signal }) => getSeller(id, { signal }),
  })
  usePageTitle(seller ? seller.shopName : "Seller verification")

  const decide =
    (decision: SellerDecision) => async (reason: string, note: string | undefined) => {
      const updated = await decideSeller(id, { decision, reason, note })
      queryClient.setQueryData<AdminSellerDetail>(sellerKeys.detail(id), updated)
      // The queues' counts changed too.
      await queryClient.invalidateQueries({ queryKey: [...sellerKeys.all, "list"] })
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      toast.success(
        `${updated.shopName}: ${VERIFICATION_STATUS_LABELS[updated.verification.status]}`
      )
    }

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Seller verification
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this seller.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{seller.shopName}</Heading>
            <Badge variant="outline">
              {VERIFICATION_STATUS_LABELS[seller.verification.status]}
            </Badge>
            {admin && canUseModule(admin, "shop-profiles") && (
              <Link
                to={`/shop-profiles/${encodeURIComponent(seller.userId)}`}
                className="text-sm underline underline-offset-4"
              >
                Shop profile
              </Link>
            )}
          </div>
          {seller.verification.note && (
            <Text variant="muted">Told the seller: “{seller.verification.note}”</Text>
          )}

          <div className="flex flex-wrap gap-2">
            <ReasonDialog
              trigger="Approve"
              triggerVariant="default"
              title={`Approve ${seller.shopName}?`}
              description="They'll be verified and payouts switch on."
              reasonLabel="What did you check?"
              confirmLabel="Approve"
              onConfirm={decide("approve")}
            />
            <ReasonDialog
              trigger="Ask for more information"
              title="Ask for more information"
              description="Their listings stay up; payouts stay off until they're verified."
              reasonLabel="What do they need to send?"
              reasonHint="The seller sees this."
              confirmLabel="Send request"
              onConfirm={decide("request_info")}
            />
            <ReasonDialog
              trigger="Reject"
              triggerVariant="destructive"
              title={`Reject ${seller.shopName}?`}
              description="Their listings can no longer be bought and payouts stay off."
              reasonHint="The seller sees this."
              confirmLabel="Reject seller"
              destructive
              noteRequired
              onConfirm={decide("reject")}
            />
            {seller.verification.status === "verified" && (
              <ReasonDialog
                trigger="Suspend verification"
                triggerVariant="destructive"
                title={`Suspend ${seller.shopName}'s verification?`}
                description="Their verified status and payouts stop until a new submission is approved. Their listings stay up."
                reasonHint="The seller sees this."
                confirmLabel="Suspend verification"
                destructive
                noteRequired
                onConfirm={decide("suspend")}
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Seller
                </Heading>
              </CardHeader>
              <CardContent>
                <dl>
                  <Row label="Type">{SELLER_TYPE_LABELS[seller.sellerType]}</Row>
                  <Row label="Owner">{seller.ownerName ?? "—"}</Row>
                  <Row label="Email">{seller.email ?? "—"}</Row>
                  <Row label="Phone">{seller.phone}</Row>
                  <Row label="Country">{seller.country}</Row>
                  <Row label="Signed up">{formatDateTime(seller.onboardedAt)}</Row>
                  <Row label="Listings / sales">
                    {seller.listings} / {seller.sales}
                  </Row>
                  {seller.business && (
                    <>
                      <Row label="Business">{seller.business.name}</Row>
                      <Row label="Tax number">
                        <span className="font-mono">{seller.business.taxNumber}</span>
                      </Row>
                    </>
                  )}
                  <Row label="Pickup">
                    {[
                      seller.pickupAddress.line1,
                      seller.pickupAddress.line2,
                      seller.pickupAddress.city,
                      seller.pickupAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Row>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Payment partner checks
                </Heading>
              </CardHeader>
              <CardContent>
                <dl>
                  <Row label="Identity">
                    {CHECK_LABELS[seller.partnerChecks.identity]}
                  </Row>
                  <Row label="Bank account">
                    {CHECK_LABELS[seller.partnerChecks.bankAccount]}
                  </Row>
                  <Row label="Business">
                    {CHECK_LABELS[seller.partnerChecks.business]}
                  </Row>
                </dl>
              </CardContent>
            </Card>
          </div>

          <VerificationCase value={seller.verificationCase} />
          <SellerMarkets seller={seller} />
          <SellerRelationshipManager seller={seller} />
          <InternalNotes kind="sellers" id={id} />
          <AuditHistory entries={seller.history} />
        </>
      )}
    </PageContainer>
  )
}
