import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { formatMoney } from "@acutehimanshu/core/money"
import {
  CATALOG_STATUS_LABELS,
  LIMITS,
  limitKeysFor,
  limitLabel,
} from "@acutehimanshu/core/domain/subscriptions"
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
import { listPlans, subscriptionKeys } from "@/modules/subscriptions/api"
import { SectionNav, SIDE_OPTIONS, useSide } from "@/modules/subscriptions/section-nav"

export function PlanList() {
  usePageTitle("Packages")
  const side = useSide()
  const { data, isPending, error } = useQuery({
    queryKey: subscriptionKeys.plans(side),
    queryFn: ({ signal }) => listPlans(side, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Heading>Packages</Heading>
          <Text variant="muted">
            What people can subscribe to. Hidden packages keep their subscribers; nothing
            is ever deleted.
          </Text>
        </div>
        <Link
          to={`/subscriptions/packages/new?side=${side}`}
          className={buttonVariants({ size: "sm" })}
        >
          New package
        </Link>
      </div>
      <SectionNav />
      <FilterTabs param="side" options={SIDE_OPTIONS} label="Packages for" />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load packages.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Price (first country)</TableHead>
              <TableHead>Limits</TableHead>
              <TableHead>Credits / month</TableHead>
              <TableHead>People</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((plan) => {
              const first = plan.prices[0]
              return (
                <TableRow key={plan.id}>
                  <TableCell>
                    <Link
                      to={`/subscriptions/packages/${plan.id}?side=${side}`}
                      className="font-medium hover:underline"
                    >
                      {plan.name}
                    </Link>
                    <span className="ml-2 inline-flex gap-1">
                      <Badge
                        variant={plan.status === "published" ? "secondary" : "outline"}
                      >
                        {CATALOG_STATUS_LABELS[plan.status]}
                      </Badge>
                      {plan.badge && <Badge variant="outline">{plan.badge}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>
                    {plan.isFree
                      ? "Free"
                      : first
                        ? `${formatMoney(first.monthly)}/mo${first.yearly ? ` · ${formatMoney(first.yearly)}/yr` : ""} (${first.country})`
                        : "No price yet"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal">
                    {limitKeysFor(side)
                      .map(
                        (key) =>
                          `${LIMITS[key].label}: ${limitLabel(key, plan.limits[key])}`
                      )
                      .join(" · ")}
                  </TableCell>
                  <TableCell>{plan.monthlyCredits}</TableCell>
                  <TableCell>{plan.subscriberCount}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  )
}
