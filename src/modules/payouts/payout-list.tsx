import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import type { PayoutFilter } from "@acutehimanshu/core/domain/admin-payouts"
import { formatMoney } from "@acutehimanshu/core/money"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { StatCard } from "@acutehimanshu/ui/components/stat-card"
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
import { usePageTitle } from "@/lib/use-page-title"
import { listPayouts, payoutKeys, type PayoutListFilter } from "@/modules/payouts/api"
import { CsvButton, exportQuery } from "@/components/csv-button"

const FILTERS: Array<{ value: PayoutFilter; label: string }> = [
  { value: "all", label: "All sellers" },
  { value: "pending", label: "Owed money" },
  { value: "held", label: "On hold" },
]

export function PayoutList() {
  usePageTitle("Payouts")
  const [params] = useSearchParams()
  const filter: PayoutListFilter = {
    status: FILTERS.find((f) => f.value === params.get("status"))?.value ?? "all",
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
  }
  const { data, isPending, error } = useQuery({
    queryKey: payoutKeys.list(filter),
    queryFn: ({ signal }) => listPayouts(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Payouts</Heading>
        <div>
          <CsvButton
            path={`/admin/payouts/export?${exportQuery(params)}`}
            filename="marketbase-payouts.csv"
          />
        </div>
        <Link to="ledger" className="text-sm font-medium underline underline-offset-4">
          Ledger and reconciliation
        </Link>
        <Text variant="muted">
          What sellers are owed. The payment partner pays out after delivery; a hold stops
          it.
        </Text>
      </div>

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load payouts.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Owed to sellers" value={formatMoney(data.totals.pending)} />
            <StatCard label="Paid out" value={formatMoney(data.totals.paidOut)} />
            <StatCard
              label="Platform fees"
              value={formatMoney(data.totals.fees)}
              note={data.totals.feeConfigured ? undefined : "Fee not set yet"}
            />
            <StatCard
              label="Sellers on hold"
              value={data.totals.heldSellers}
              highlight={data.totals.heldSellers > 0}
            />
          </div>
          <FilterTabs param="status" options={FILTERS} label="Filter sellers" />
          <SearchBox label="Search sellers" placeholder="Shop or seller ID" />
          {data.sellers.items.length === 0 ? (
            <Text variant="muted">No sellers here.</Text>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Owed</TableHead>
                    <TableHead className="text-right">Paid out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sellers.items.map((row) => (
                    <TableRow key={row.sellerId}>
                      <TableCell>
                        <Link to={row.sellerId} className="font-medium hover:underline">
                          {row.shopName}
                        </Link>
                        <span className="ml-2 inline-flex gap-1">
                          {row.hold && <Badge variant="destructive">On hold</Badge>}
                          {!row.hold && !row.payoutsEnabled && (
                            <Badge variant="outline">Not verified</Badge>
                          )}
                          {row.openDisputes > 0 && (
                            <Badge variant="outline">
                              {row.openDisputes} open dispute
                              {row.openDisputes > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.pending)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.paidOut)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pager page={data.sellers} />
            </>
          )}
        </>
      )}
    </PageContainer>
  )
}
