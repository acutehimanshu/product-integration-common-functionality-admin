import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"
import {
  SHOP_LINK_LABELS,
  SHOP_PROFILE_FIELD_LABELS,
  SHOP_PROFILE_FIELDS,
  type AdminShopProfileDetail,
  type AdminShopProfileRow,
  type ShopProfileField,
} from "@acutehimanshu/core/domain/shop-profile"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { FilterTabs } from "@/components/filter-tabs"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

const keys = {
  all: ["admin", "shop-profiles"] as const,
  list: (status: string) => ["admin", "shop-profiles", "list", status] as const,
  detail: (id: string) => ["admin", "shop-profiles", id] as const,
}

const FILTERS = [
  { value: "reported", label: "Reported" },
  { value: "all", label: "All" },
]

function ShopProfileList() {
  usePageTitle("Shop profiles")
  const [params] = useSearchParams()
  const status = params.get("status") === "all" ? "all" : "reported"
  const { data, isPending, error } = useQuery({
    queryKey: keys.list(status),
    queryFn: ({ signal }) =>
      api.get<AdminShopProfileRow[]>(`/admin/shop-profiles?status=${status}`, { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Shop profiles</Heading>
        <Text variant="muted">
          What sellers put on their public pages. Buyers report problems; hide or reset a
          part with a reason and the seller is told.
        </Text>
      </div>
      <FilterTabs param="status" options={FILTERS} label="Filter shop profiles" />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load shop profiles.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.length === 0 ? (
        <Text variant="muted">
          {status === "reported"
            ? "Nothing reported right now."
            : "No shop profiles yet."}
        </Text>
      ) : (
        <ul
          aria-label="Shop profiles"
          className="flex flex-col divide-y rounded-xl border"
        >
          {data.map((row) => (
            <li
              key={row.sellerId}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <Link to={row.sellerId} className="flex-1 font-medium hover:underline">
                {row.shopName}
              </Link>
              {row.openReports > 0 && (
                <Badge variant="destructive">
                  {row.openReports} report{row.openReports === 1 ? "" : "s"}
                </Badge>
              )}
              {row.hiddenFields.length > 0 && (
                <Badge variant="outline">{row.hiddenFields.length} hidden</Badge>
              )}
              {row.lastReportAt && (
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(row.lastReportAt)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

/** One field's current content, as the seller saved it. */
function FieldValue({
  field,
  data,
}: {
  field: ShopProfileField
  data: AdminShopProfileDetail
}) {
  const p = data.profile
  const empty = <span className="text-muted-foreground">Empty</span>
  switch (field) {
    case "logo":
    case "banner": {
      const url = field === "logo" ? p.logoUrl : p.bannerUrl
      return url ? (
        <img
          src={url}
          alt={`${SHOP_PROFILE_FIELD_LABELS[field]} of ${data.shopName}`}
          className={
            field === "logo"
              ? "size-16 rounded-full object-cover"
              : "aspect-[4/1] w-64 rounded-lg object-cover"
          }
        />
      ) : (
        empty
      )
    }
    case "links":
      return p.links.length ? (
        <ul className="flex flex-col gap-0.5">
          {p.links.map((link) => (
            <li key={link.url}>
              {SHOP_LINK_LABELS[link.kind]}: <span className="break-all">{link.url}</span>
            </li>
          ))}
        </ul>
      ) : (
        empty
      )
    default: {
      const text = p[field]
      return text ? <p className="whitespace-pre-line">{text}</p> : empty
    }
  }
}

function ShopProfileDetail() {
  const { sellerId = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: keys.detail(sellerId),
    queryFn: ({ signal }) =>
      api.get<AdminShopProfileDetail>(`/admin/shop-profiles/${sellerId}`, { signal }),
  })
  usePageTitle(data?.shopName ?? "Shop profile")

  const act = async (
    action: "hide" | "reset" | "restore" | "dismiss",
    reason: string,
    field?: ShopProfileField,
    note?: string
  ) => {
    const updated = await api.post<AdminShopProfileDetail>(
      `/admin/shop-profiles/${sellerId}/${action}`,
      { ...(field && { field }), reason, ...(note && { note }) }
    )
    queryClient.setQueryData(keys.detail(sellerId), updated)
    await queryClient.invalidateQueries({ queryKey: keys.all, exact: false })
    toast.success(
      {
        hide: "Hidden — the seller has been told",
        reset: "Reset — the seller has been told",
        restore: "Shown again",
        dismiss: "Reports dismissed",
      }[action]
    )
  }

  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Shop profiles
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this shop profile.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{data.shopName}</Heading>
            {!data.hasPerk && (
              <Badge variant="outline">No package — only the bio shows</Badge>
            )}
            {data.slug && <Badge variant="secondary">/shop/{data.slug}</Badge>}
          </div>

          <section aria-labelledby="shop-reports" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="shop-reports">
              Reports
            </Heading>
            {data.reports.length === 0 ? (
              <Text variant="muted">No reports.</Text>
            ) : (
              <ul aria-label="Reports" className="flex flex-col gap-2 text-sm">
                {data.reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-baseline gap-2">
                    <Badge variant={report.status === "open" ? "destructive" : "outline"}>
                      {report.status === "open"
                        ? "Open"
                        : report.status === "actioned"
                          ? "Actioned"
                          : "Dismissed"}
                    </Badge>
                    <span className="font-medium">{report.reason}</span>
                    {report.details && <span>— “{report.details}”</span>}
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(report.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data.openReports > 0 && (
              <div>
                <ReasonDialog
                  trigger="Dismiss reports"
                  title="Dismiss the open reports?"
                  description="Nothing changes on the shop's page. The reporters aren't told."
                  confirmLabel="Dismiss"
                  onConfirm={(reason) => act("dismiss", reason)}
                />
              </div>
            )}
          </section>

          <section aria-labelledby="shop-fields" className="flex flex-col gap-2">
            <Heading as="h2" size="h3" id="shop-fields">
              Profile
            </Heading>
            <ul
              aria-label="Profile fields"
              className="flex flex-col divide-y rounded-xl border"
            >
              {SHOP_PROFILE_FIELDS.map((field) => {
                const label = SHOP_PROFILE_FIELD_LABELS[field]
                const hidden = data.hidden[field]
                return (
                  <li
                    key={field}
                    aria-label={label}
                    className="flex flex-col gap-2 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex-1 font-medium">{label}</span>
                      {hidden && <Badge variant="destructive">Hidden</Badge>}
                    </div>
                    <FieldValue field={field} data={data} />
                    {hidden && (
                      <p className="text-muted-foreground">
                        Hidden {formatDateTime(hidden.at)}: {hidden.reason}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {hidden ? (
                        <ReasonDialog
                          trigger={`Show ${label.toLowerCase()} again`}
                          title={`Show the ${label.toLowerCase()} again?`}
                          description="It goes back on the shop's page."
                          confirmLabel="Show again"
                          onConfirm={(reason) => act("restore", reason, field)}
                        />
                      ) : (
                        <ReasonDialog
                          trigger={`Hide ${label.toLowerCase()}`}
                          title={`Hide the ${label.toLowerCase()}?`}
                          description="It comes off the shop's page but is kept; the seller sees your reason and can edit it."
                          reasonHint="The seller sees this."
                          confirmLabel="Hide"
                          noteRequired
                          onConfirm={(reason, note) => act("hide", reason, field, note)}
                        />
                      )}
                      <ReasonDialog
                        trigger={`Reset ${label.toLowerCase()}`}
                        title={`Reset the ${label.toLowerCase()}?`}
                        description="It's cleared for good. The seller sees your reason."
                        reasonHint="The seller sees this."
                        confirmLabel="Reset"
                        destructive
                        noteRequired
                        onConfirm={(reason, note) => act("reset", reason, field, note)}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}

/** Shop profiles moderation: the reported queue, and one shop's profile. */
export default function ShopProfilesPage() {
  return (
    <Routes>
      <Route index element={<ShopProfileList />} />
      <Route path=":sellerId" element={<ShopProfileDetail />} />
    </Routes>
  )
}
