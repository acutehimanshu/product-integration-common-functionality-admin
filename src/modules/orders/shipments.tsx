import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import type { Page } from "@acutehimanshu/core/types/page"
import type { Money } from "@acutehimanshu/core/types/money"
import { formatMoney } from "@acutehimanshu/core/money"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { SubNav } from "@/components/sub-nav"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import { ORDER_TABS } from "@/modules/orders/reconcile-queue"

type ShipmentRow = {
  orderId: string
  shopName: string
  service: string
  status: string
  carrier: string | null
  trackingNumber: string | null
  trackingSource: "carrier" | "manual" | null
  bookingRef: string | null
  buyerPaid: Money
  carrierCost: Money | null
  problem: string | null
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "exceptions", label: "Exceptions" },
]

/**
 * Shipping operations (FRD-06 PFS-069): bookings, tracking (carrier or the
 * seller's own), what the buyer paid against the carrier's cost, and problems.
 */
export function Shipments() {
  usePageTitle("Shipping")
  const [params] = useSearchParams()
  const state = FILTERS.find((f) => f.value === params.get("state"))?.value ?? "all"
  const page = Number(params.get("page")) || 1
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "shipments", state, page],
    queryFn: ({ signal }) =>
      api.get<Page<ShipmentRow>>(`/admin/shipments?state=${state}&page=${page}`, {
        signal,
      }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Orders</Heading>
        <Text variant="muted">Every delivery: service, booking, tracking and cost.</Text>
      </div>
      <SubNav tabs={ORDER_TABS} label="Orders" />
      <FilterTabs param="state" options={FILTERS} label="Filter shipments" />
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load shipments.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-48" />}
      {data && data.items.length === 0 && <Text variant="muted">Nothing here.</Text>}
      {data && data.items.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Shipments">
          {data.items.map((row) => (
            <li
              key={row.orderId}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  <Link to={`/orders/${row.orderId}`} className="underline">
                    {row.orderId}
                  </Link>
                  · {row.shopName} · {row.service}
                  {row.trackingSource === "manual" && (
                    <Badge variant="outline">Seller&apos;s courier — not verified</Badge>
                  )}
                  {row.problem && <Badge variant="destructive">{row.problem}</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {row.carrier
                    ? `${row.carrier} ${row.trackingNumber ?? ""}`
                    : "No label yet"}
                  {row.bookingRef ? ` · booking ${row.bookingRef}` : ""} · buyer paid{" "}
                  {formatMoney(row.buyerPaid)}
                  {row.carrierCost
                    ? ` · carrier cost ${formatMoney(row.carrierCost)}`
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data} />}
    </PageContainer>
  )
}
