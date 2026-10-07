import { useQuery } from "@tanstack/react-query"
import { formatMoney } from "@acutehimanshu/core/money"
import type { AdminDashboard } from "@acutehimanshu/core/domain/admin"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { StatCard } from "@acutehimanshu/ui/components/stat-card"
import { RouterLink } from "@/components/router-link"
import { api, getErrorMessage } from "@/lib/api"
import { useAdmin } from "@/lib/auth"
import { usePageTitle } from "@/lib/use-page-title"
import { canUseModule } from "@/modules"
import type { AdminModuleId } from "@/modules/types"
import { AdminInsights } from "@/modules/dashboard/admin-insights"

export default function DashboardPage() {
  usePageTitle("Dashboard")
  const { data: admin } = useAdmin()
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) => api.get<AdminDashboard>("/admin/dashboard", { signal }),
  })

  // A tile links to its screen only if this admin may open it.
  const link = (module: AdminModuleId, href: string) =>
    admin && canUseModule(admin, module) ? href : undefined

  return (
    <PageContainer maxWidth="6xl">
      <div className="flex flex-col gap-1">
        <Heading>Hello, {admin?.name.split(" ")[0]}</Heading>
        <Text variant="muted">
          What needs someone today, and how the marketplace is doing.
        </Text>
      </div>

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the dashboard.")}
        </Text>
      ) : isPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="queues-heading" className="flex flex-col gap-3">
            <Heading as="h2" size="h3" id="queues-heading">
              Needs attention
            </Heading>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard
                linkAs={RouterLink}
                label="Seller verifications"
                value={data.queues.sellerVerifications}
                href={link("sellers", "/sellers")}
                highlight={data.queues.sellerVerifications > 0}
              />
              <StatCard
                linkAs={RouterLink}
                label="Flagged listings"
                value={data.queues.flaggedListings}
                href={link("listings", "/listings")}
                highlight={data.queues.flaggedListings > 0}
              />
              <StatCard
                linkAs={RouterLink}
                label="Open disputes"
                value={data.queues.openDisputes}
                href={link("disputes", "/disputes")}
                highlight={data.queues.openDisputes > 0}
              />
              <StatCard
                linkAs={RouterLink}
                label="Late shipments"
                value={data.queues.lateShipments}
                href={link("orders", "/orders")}
                note="Paid, past ship-by"
                highlight={data.queues.lateShipments > 0}
              />
              <StatCard
                linkAs={RouterLink}
                label="Held payouts"
                value={data.queues.heldPayouts}
                href={link("payouts", "/payouts")}
                highlight={data.queues.heldPayouts > 0}
              />
            </div>
          </section>

          <section aria-labelledby="today-heading" className="flex flex-col gap-3">
            <Heading as="h2" size="h3" id="today-heading">
              Today
            </Heading>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Orders" value={data.today.orders} />
              <StatCard label="Order value" value={formatMoney(data.today.gmv)} />
              <StatCard label="New users" value={data.today.newUsers} />
              <StatCard label="New listings" value={data.today.newListings} />
            </div>
          </section>

          <section aria-labelledby="totals-heading" className="flex flex-col gap-3">
            <Heading as="h2" size="h3" id="totals-heading">
              All time
            </Heading>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard
                linkAs={RouterLink}
                label="Users"
                value={data.totals.users}
                href={link("users", "/users")}
              />
              <StatCard label="Sellers" value={data.totals.sellers} />
              <StatCard label="Active listings" value={data.totals.activeListings} />
            </div>
          </section>

          <AdminInsights />
        </>
      )}
    </PageContainer>
  )
}
