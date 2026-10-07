import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import {
  SELLER_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@acutehimanshu/core/domain/seller"
import type { SellerReviewFilter } from "@acutehimanshu/core/domain/admin-sellers"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
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
import { timeAgo } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { listSellers, sellerKeys } from "@/modules/sellers/api"
import { CsvButton, exportQuery } from "@/components/csv-button"

const FILTERS: Array<{ value: SellerReviewFilter; label: string }> = [
  { value: "pending", label: "Waiting for review" },
  { value: "more_info_needed", label: "More info asked" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
]

export function SellerQueue() {
  usePageTitle("Seller verification")
  const [params] = useSearchParams()
  const status = FILTERS.find((f) => f.value === params.get("status"))?.value ?? "pending"
  const q = params.get("q") ?? ""
  const page = Number(params.get("page")) || 1
  const filter = { status, q, page }

  const { data, isPending, error } = useQuery({
    queryKey: sellerKeys.list(filter),
    queryFn: ({ signal }) => listSellers(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Seller verification</Heading>
        <div>
          <CsvButton
            path={`/admin/sellers/export?${exportQuery(params)}`}
            filename="marketbase-sellers.csv"
          />
        </div>
        <Text variant="muted">
          Sellers the payment partner couldn&apos;t verify on its own — oldest first.
        </Text>
      </div>
      <FilterTabs param="status" options={FILTERS} label="Filter sellers" />
      <SearchBox label="Search sellers" placeholder="Shop, owner, email or ID" />

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load sellers.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nobody in this list.</Text>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waiting</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <Link to={row.userId} className="font-medium hover:underline">
                      {row.shopName}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {row.ownerName ?? "—"} · {row.email ?? row.phone}
                    </span>
                  </TableCell>
                  <TableCell>{SELLER_TYPE_LABELS[row.sellerType]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {VERIFICATION_STATUS_LABELS[row.verification.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {timeAgo(row.onboardedAt)}
                  </TableCell>
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
