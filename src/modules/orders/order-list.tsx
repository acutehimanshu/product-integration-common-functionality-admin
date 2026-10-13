import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import type { AdminOrderFilter } from "@acutehimanshu/core/domain/admin-orders"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { OrderStatusBadge } from "@acutehimanshu/ui/components/order-status-badge"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acutehimanshu/ui/components/ui/table"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { SearchBox } from "@/components/search-box"
import { getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { listOrders, orderKeys, type OrderFilter } from "@/modules/orders/api"
import { CsvButton, exportQuery } from "@/components/csv-button"
import { SubNav } from "@/components/sub-nav"
import { ORDER_TABS } from "@/modules/orders/reconcile-queue"

const FILTERS: Array<{ value: AdminOrderFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "late", label: "Late shipments" },
  { value: "to_ship", label: "To ship" },
  { value: "in_transit", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

export function OrderList() {
  usePageTitle("Orders")
  const [params] = useSearchParams()
  const filter: OrderFilter = {
    status: FILTERS.find((f) => f.value === params.get("status"))?.value ?? "all",
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
  }
  const { data, isPending, error } = useQuery({
    queryKey: orderKeys.list(filter),
    queryFn: ({ signal }) => listOrders(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Orders</Heading>
        <div>
          <CsvButton
            path={`/admin/orders/export?${exportQuery(params)}`}
            filename="marketbase-orders.csv"
          />
        </div>
        <Text variant="muted">Every order on the marketplace, newest first.</Text>
      </div>
      <SubNav tabs={ORDER_TABS} label="Orders" />
      <FilterTabs param="status" options={FILTERS} label="Filter orders" />
      <SearchBox label="Search orders" placeholder="Order ID, buyer or shop" />

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load orders.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">No orders here.</Text>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Buyer → shop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to={order.id} className="font-mono font-medium hover:underline">
                      {order.id}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.buyer.name ?? order.buyer.id} → {order.seller.shopName}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <OrderStatusBadge status={order.status} />
                      {order.late && <Badge variant="destructive">Late</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(order.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={data} />
        </>
      )}
    </PageContainer>
  )
}
