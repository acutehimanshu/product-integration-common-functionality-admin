import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Label } from "@acutehimanshu/ui/components/ui/label"
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
import { api, getErrorMessage } from "@/lib/api"
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
  const [params, setParams] = useSearchParams()
  const status = FILTERS.find((f) => f.value === params.get("status"))?.value ?? "pending"
  const q = params.get("q") ?? ""
  const page = Number(params.get("page")) || 1
  // Country and seller type (FRD-03 03-044), kept in the URL like the rest.
  const country = params.get("country") ?? ""
  const type = params.get("type") ?? ""
  const filter = { status, q, page, country, type }
  const setFilter = (key: "country" | "type", value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete("page")
      return next
    })
  const countries = useQuery({
    queryKey: ["reference", "countries"],
    queryFn: ({ signal }) => api.get<SupportedCountry[]>("/countries", { signal }),
  })

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
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="sellers-country">Country</Label>
          <NativeSelect
            id="sellers-country"
            value={country}
            onChange={(e) => setFilter("country", e.target.value)}
          >
            <option value="">Any</option>
            {(countries.data ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="sellers-type">Seller type</Label>
          <NativeSelect
            id="sellers-type"
            value={type}
            onChange={(e) => setFilter("type", e.target.value)}
          >
            <option value="">Any</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </NativeSelect>
        </div>
      </div>

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
