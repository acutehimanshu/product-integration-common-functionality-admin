import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { formatMoney } from "@acutehimanshu/core/money"
import { CATALOG_STATUS_LABELS } from "@acutehimanshu/core/domain/subscriptions"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { buttonVariants } from "@acutehimanshu/ui/components/ui/button"
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
import { getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import { listPacks, subscriptionKeys } from "@/modules/subscriptions/api"
import { SectionNav, SIDE_OPTIONS, useSide } from "@/modules/subscriptions/section-nav"

export function PackList() {
  usePageTitle("Credit packs")
  const side = useSide()
  const { data, isPending, error } = useQuery({
    queryKey: subscriptionKeys.packs(side),
    queryFn: ({ signal }) => listPacks(side, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Heading>Credit packs</Heading>
          <Text variant="muted">Credits anyone can buy — with or without a package.</Text>
        </div>
        <Link
          to={`/subscriptions/packs/new?side=${side}`}
          className={buttonVariants({ size: "sm" })}
        >
          New credit pack
        </Link>
      </div>
      <SectionNav />
      <FilterTabs param="side" options={SIDE_OPTIONS} label="Credit packs for" />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load credit packs.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.length === 0 ? (
        <Text variant="muted">No credit packs yet.</Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pack</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Price (first country)</TableHead>
              <TableHead>Credits last</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((pack) => (
              <TableRow key={pack.id}>
                <TableCell>
                  <Link
                    to={`/subscriptions/packs/${pack.id}?side=${side}`}
                    className="font-medium hover:underline"
                  >
                    {pack.name}
                  </Link>
                  <span className="ml-2 inline-flex gap-1">
                    <Badge
                      variant={pack.status === "published" ? "secondary" : "outline"}
                    >
                      {CATALOG_STATUS_LABELS[pack.status]}
                    </Badge>
                    {pack.badge && <Badge variant="outline">{pack.badge}</Badge>}
                  </span>
                </TableCell>
                <TableCell>
                  {pack.credits}
                  {pack.bonusCredits > 0 && ` + ${pack.bonusCredits} free`}
                </TableCell>
                <TableCell>
                  {pack.prices[0]
                    ? `${formatMoney(pack.prices[0].price)} (${pack.prices[0].country})`
                    : "No price yet"}
                </TableCell>
                <TableCell>{pack.validityMonths} months</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  )
}
