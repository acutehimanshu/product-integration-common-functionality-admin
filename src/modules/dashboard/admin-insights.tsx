import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import {
  STATS_RANGE_LABELS,
  STATS_RANGES,
  type AdminStats,
  type StatsRange,
} from "@acutehimanshu/core/domain/stats"
import { formatMoney, formatMoneyCompact } from "@acutehimanshu/core/money"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import {
  MonthlyColumnChart,
  RangePicker,
  TimeSeriesChart,
} from "@acutehimanshu/ui/components/charts"
import { api, getErrorMessage } from "@/lib/api"

const count = (n: number) => n.toLocaleString("en")

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <Heading as="h3" size="h3">
          {title}
        </Heading>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** The admin dashboard's "How the marketplace is doing": trends over a period. */
export function AdminInsights() {
  const [params, setParams] = useSearchParams()
  const asked = params.get("range")
  const range: StatsRange = STATS_RANGES.includes(asked as StatsRange)
    ? (asked as StatsRange)
    : "30d"
  const { data, error } = useQuery({
    queryKey: ["admin", "stats", range],
    queryFn: ({ signal }) =>
      api.get<AdminStats>(`/admin/stats?range=${range}`, { signal }),
  })
  const money = (amount: number) => formatMoney({ amount, currency: data!.currency })
  const tick = (amount: number) => formatMoneyCompact(amount, data!.currency)

  return (
    <section aria-labelledby="trends-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading as="h2" size="h3" id="trends-heading">
          Trends
        </Heading>
        <RangePicker
          value={range}
          options={STATS_RANGES.map((value) => ({
            value,
            label: STATS_RANGE_LABELS[value],
          }))}
          onChange={(next) =>
            setParams(
              (current) => {
                current.set("range", next)
                return current
              },
              { replace: true }
            )
          }
        />
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the trends.")}
        </Text>
      ) : !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Text variant="muted" className="text-sm">
            Last {STATS_RANGE_LABELS[range]}: {money(data.totals.sales.amount)} in sales ·{" "}
            {count(data.totals.orders)} orders · {count(data.totals.newUsers)} new people
            · {count(data.totals.newSellers)} new sellers · {count(data.totals.problems)}{" "}
            problems reported
          </Text>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Sales">
              <TimeSeriesChart
                title="Marketplace sales per day"
                data={data.daily}
                series={[{ key: "sales", label: "Sales", slot: 1 }]}
                formatValue={money}
                formatTick={tick}
              />
            </ChartCard>
            <ChartCard title="Orders">
              <TimeSeriesChart
                title="Orders per day"
                data={data.daily}
                series={[{ key: "orders", label: "Orders", slot: 1 }]}
                formatValue={count}
              />
            </ChartCard>
            <ChartCard title="New people">
              <TimeSeriesChart
                title="New users and new sellers per day"
                data={data.daily}
                series={[
                  { key: "newUsers", label: "New users", slot: 1 },
                  { key: "newSellers", label: "New sellers", slot: 2 },
                ]}
                formatValue={count}
              />
            </ChartCard>
            <ChartCard title="Problems reported">
              <TimeSeriesChart
                title="Problems reported per day"
                data={data.daily}
                series={[{ key: "problems", label: "Problems", slot: 1 }]}
                formatValue={count}
              />
            </ChartCard>
            <ChartCard title="Subscription revenue">
              <MonthlyColumnChart
                title="Packages and credit packs charged per month"
                data={data.subscriptionRevenue}
                formatValue={money}
                formatTick={tick}
              />
            </ChartCard>
          </div>
        </>
      )}
    </section>
  )
}
