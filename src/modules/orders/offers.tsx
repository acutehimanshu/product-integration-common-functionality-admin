import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import type { Page } from "@acutehimanshu/core/types/page"
import {
  OFFER_STATUS_LABELS,
  type AdminOfferRow,
} from "@acutehimanshu/core/domain/offers"
import { formatMoney } from "@acutehimanshu/core/money"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { FilterTabs } from "@/components/filter-tabs"
import { Pager } from "@/components/pager"
import { SearchBox } from "@/components/search-box"
import { SubNav } from "@/components/sub-nav"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { ORDER_TABS } from "@/modules/orders/reconcile-queue"

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Waiting for the seller" },
  { value: "countered", label: "Countered" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
]

/**
 * Admin › Orders › Offers (FRD-08 COM-001): every negotiation with who did
 * what — buyer, seller or Marketbase's automatic answer.
 */
export function OfferList() {
  usePageTitle("Offers")
  const [params] = useSearchParams()
  const query = new URLSearchParams({
    status: params.get("status") ?? "",
    q: params.get("q") ?? "",
    page: params.get("page") ?? "1",
  }).toString()
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "offers", query],
    queryFn: ({ signal }) =>
      api.get<Page<AdminOfferRow>>(`/admin/offers?${query}`, { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Heading>Orders</Heading>
      <SubNav tabs={ORDER_TABS} label="Orders" />
      <FilterTabs param="status" options={FILTERS} label="Filter offers" />
      <SearchBox label="Search offers" placeholder="Offer ID, item, shop or buyer" />
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load offers.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-40" />}
      {data?.items.length === 0 && <Text variant="muted">No offers match.</Text>}
      {data && data.items.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Offers"
        >
          {data.items.map((offer) => (
            <li key={offer.id} className="flex flex-col gap-1 p-3">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {offer.listingTitle} · {offer.shopName} ·{" "}
                {offer.buyerName ?? offer.buyerId}
                <Badge variant="outline">{OFFER_STATUS_LABELS[offer.status]}</Badge>
                {offer.policy?.ruleId && (
                  <Badge variant="secondary">{offer.policy.ruleName}</Badge>
                )}
              </span>
              <ol
                className="text-muted-foreground text-xs"
                aria-label={`History of ${offer.id}`}
              >
                {offer.events.map((event) => (
                  <li key={`${event.at}-${event.action}`}>
                    {formatDateTime(event.at)} — {event.actor} {event.action}
                    {event.price && ` ${formatMoney(event.price)}`}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data} />}
    </PageContainer>
  )
}
