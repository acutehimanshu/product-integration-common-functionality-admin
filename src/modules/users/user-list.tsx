import { useQuery } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router"
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
import { ACCOUNT_STATUS_LABELS } from "@acutehimanshu/core/domain/admin-users"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { listUsers, userKeys, type UserFilter } from "@/modules/users/api"
import { CsvButton, exportQuery } from "@/components/csv-button"

const FILTERS: Array<{ value: UserFilter["status"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "closed", label: "Closed" },
]

export function UserList() {
  usePageTitle("Users")
  const [params] = useSearchParams()
  const filter: UserFilter = {
    status: FILTERS.find((f) => f.value === params.get("status"))?.value ?? "all",
    q: params.get("q") ?? "",
    page: Number(params.get("page")) || 1,
  }
  const { data, isPending, error } = useQuery({
    queryKey: userKeys.list(filter),
    queryFn: ({ signal }) => listUsers(filter, { signal }),
  })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Users</Heading>
        <div>
          <CsvButton
            path={`/admin/users/export?${exportQuery(params)}`}
            filename="marketbase-users.csv"
          />
        </div>
        <Text variant="muted">Every marketplace account — buyers and sellers.</Text>
      </div>
      <FilterTabs param="status" options={FILTERS} label="Filter users" />
      <SearchBox label="Search users" placeholder="Name, email, phone, shop or ID" />

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load users.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">No accounts match.</Text>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Sells as</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link to={user.id} className="font-medium hover:underline">
                      {user.name ?? user.email ?? user.phone ?? user.id}
                    </Link>
                    {user.status !== "active" && (
                      <Badge
                        variant={user.status === "suspended" ? "destructive" : "outline"}
                        className="ml-2"
                      >
                        {ACCOUNT_STATUS_LABELS[user.status]}
                      </Badge>
                    )}
                    <span className="text-muted-foreground block text-xs">
                      {user.email ?? user.phone}
                    </span>
                  </TableCell>
                  <TableCell>{user.shopName ?? "—"}</TableCell>
                  <TableCell>{user.ordersPlaced}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(user.createdAt)}
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
