import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
import {
  BILLING_INTERVAL_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@acutehimanshu/core/domain/subscriptions"
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
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import {
  listSubscribers,
  subscriptionKeys,
  type SubscriberFilter,
} from "@/modules/subscriptions/api"
import { SectionNav, SIDE_OPTIONS, useSide } from "@/modules/subscriptions/section-nav"

export function SubscriberList() {
  usePageTitle("Subscribers")
  const side = useSide()
  const [params] = useSearchParams()
  const filter: SubscriberFilter = {
    side,
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
  }
  const { data, isPending, error } = useQuery({
    queryKey: subscriptionKeys.subscribers(filter),
    queryFn: ({ signal }) => listSubscribers(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Subscribers</Heading>
        <Text variant="muted">
          Everyone with a package or credits. Open one to see their credit history or add
          and remove credits.
        </Text>
      </div>
      <SectionNav />
      <FilterTabs param="side" options={SIDE_OPTIONS} label="Subscribers on" />
      <SearchBox label="Search subscribers" placeholder="Name, shop, email or ID" />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load subscribers.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">Nobody yet.</Text>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Renews / ends</TableHead>
                <TableHead>Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <Link
                      to={`/subscriptions/subscribers/${row.userId}?side=${side}`}
                      className="font-medium hover:underline"
                    >
                      {row.name ?? row.email ?? row.userId}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {row.email ?? row.userId}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.plan.name}
                    {row.interval && ` · ${BILLING_INTERVAL_LABELS[row.interval]}`}
                    {row.status && row.status !== "active" && (
                      <Badge variant="outline" className="ml-2">
                        {SUBSCRIPTION_STATUS_LABELS[row.status]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.renewsAt ? formatDateTime(row.renewsAt) : "—"}
                  </TableCell>
                  <TableCell>{row.credits}</TableCell>
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
