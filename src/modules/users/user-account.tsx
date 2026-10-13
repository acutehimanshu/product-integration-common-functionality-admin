import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { VERIFICATION_STATUS_LABELS } from "@acutehimanshu/core/domain/seller"
import {
  ACCOUNT_STATUS_LABELS,
  type AdminUserDetail,
} from "@acutehimanshu/core/domain/admin-users"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { OrderStatusBadge } from "@acutehimanshu/ui/components/order-status-badge"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { InternalNotes } from "@/components/internal-notes"
import { ReasonDialog } from "@/components/reason-dialog"
import { getErrorMessage } from "@/lib/api"
import { useAdmin } from "@/lib/auth"
import { canUseModule } from "@/modules"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import {
  getUser,
  restoreSelling,
  restoreUser,
  suspendSelling,
  suspendUser,
  userKeys,
} from "@/modules/users/api"

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  )
}

export function UserAccount() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data: admin } = useAdmin()
  const {
    data: user,
    isPending,
    error,
  } = useQuery({
    queryKey: userKeys.detail(id),
    queryFn: ({ signal }) => getUser(id, { signal }),
  })
  const displayName = user ? (user.name ?? user.email ?? user.phone ?? user.id) : "Users"
  usePageTitle(displayName)

  const saved = async (updated: AdminUserDetail, message: string) => {
    queryClient.setQueryData(userKeys.detail(id), updated)
    await queryClient.invalidateQueries({ queryKey: [...userKeys.all, "list"] })
    toast.success(message)
  }

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Users
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this account.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{displayName}</Heading>
            <Badge variant={user.status === "suspended" ? "destructive" : "outline"}>
              {ACCOUNT_STATUS_LABELS[user.status]}
            </Badge>
          </div>
          {user.suspension && (
            <Text variant="muted">
              Suspended {formatDateTime(user.suspension.at)}: “{user.suspension.reason}”
            </Text>
          )}

          <div className="flex flex-wrap gap-2">
            {user.status !== "closed" && user.status !== "suspended" && (
              <ReasonDialog
                trigger="Suspend account"
                triggerVariant="destructive"
                title={`Suspend ${displayName}?`}
                description="They're logged out everywhere and can't log in. Their listings can't be bought. Orders already placed carry on."
                confirmLabel="Suspend"
                destructive
                noteRequired
                onConfirm={async (reason, note = "") =>
                  saved(await suspendUser(id, { reason, note }), "Account suspended")
                }
              />
            )}
            {user.status === "suspended" && (
              <ReasonDialog
                trigger="Restore account"
                title={`Restore ${displayName}?`}
                description="They can log in again and their listings go back on sale."
                confirmLabel="Restore"
                onConfirm={async (reason) =>
                  saved(await restoreUser(id, reason), "Account restored")
                }
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Account
                </Heading>
              </CardHeader>
              <CardContent>
                <dl>
                  <Row label="Email">{user.email ?? "—"}</Row>
                  <Row label="Phone">{user.phone ?? "—"}</Row>
                  <Row label="Country">{user.country ?? "—"}</Row>
                  <Row label="Joined">{formatDateTime(user.createdAt)}</Row>
                  <Row label="Terms & privacy">
                    {user.consents.legal.length === 0
                      ? "Not accepted"
                      : user.consents.legal
                          .map((c) => `${c.page} v${c.version} (${formatDateTime(c.at)})`)
                          .join(", ")}
                    {user.consents.legal.length > 0 &&
                      !user.consents.legalCurrent &&
                      " — a newer version is waiting"}
                  </Row>
                  <Row label="Marketing">
                    {user.consents.marketing
                      ? marketingLine(user.consents.marketing)
                      : "Never asked"}
                  </Row>
                  <Row label="Account ID">
                    <span className="font-mono">{user.id}</span>
                  </Row>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Selling
                </Heading>
              </CardHeader>
              <CardContent>
                {user.seller ? (
                  <dl>
                    <Row label="Shop">{user.shopName}</Row>
                    <Row label="Verification">
                      {VERIFICATION_STATUS_LABELS[user.seller.verification]}
                    </Row>
                    <Row label="Listings">
                      {user.seller.activeListings} on sale of {user.seller.listings}
                    </Row>
                    <Row label="Sales">{user.seller.sales}</Row>
                    <Row label="Selling">
                      {user.seller.sellingSuspension
                        ? `Paused ${formatDateTime(user.seller.sellingSuspension.at)}: “${user.seller.sellingSuspension.reason}”`
                        : "Allowed"}
                    </Row>
                  </dl>
                ) : (
                  <Text variant="muted">Hasn&apos;t started selling.</Text>
                )}
                {user.seller && user.status === "active" && (
                  <div className="mt-3">
                    {user.seller.sellingSuspension ? (
                      <ReasonDialog
                        trigger="Restore selling"
                        title={`Restore selling for ${displayName}?`}
                        description="Their listings go back on sale and they can publish and quote again."
                        confirmLabel="Restore selling"
                        onConfirm={async (reason) =>
                          saved(await restoreSelling(id, reason), "Selling restored")
                        }
                      />
                    ) : (
                      <ReasonDialog
                        trigger="Pause selling"
                        triggerVariant="destructive"
                        title={`Pause selling for ${displayName}?`}
                        description="Their listings can't be bought and they can't publish or quote. They can still log in and buy, and orders already placed carry on."
                        confirmLabel="Pause selling"
                        destructive
                        noteRequired
                        onConfirm={async (reason, note = "") =>
                          saved(
                            await suspendSelling(id, { reason, note }),
                            "Selling paused"
                          )
                        }
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <section aria-labelledby="orders-heading" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="orders-heading">
              Orders placed ({user.ordersPlaced})
            </Heading>
            {user.recentOrders.length === 0 ? (
              <Text variant="muted">No orders yet.</Text>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border text-sm">
                {user.recentOrders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center gap-3 p-3">
                    {admin && canUseModule(admin, "orders") ? (
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-mono hover:underline"
                      >
                        {order.id}
                      </Link>
                    ) : (
                      <span className="font-mono">{order.id}</span>
                    )}
                    <span className="text-muted-foreground">
                      {order.shopName} · {formatDateTime(order.createdAt)}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      {formatMoney(order.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <InternalNotes kind="users" id={id} />
          <AuditHistory entries={user.history} />
        </>
      )}
    </PageContainer>
  )
}

function marketingLine(choice: { granted: boolean; at: string }): string {
  const what = choice.granted ? "Opted in" : "Opted out"
  return `${what} ${formatDateTime(choice.at)}`
}
