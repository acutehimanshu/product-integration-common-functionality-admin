import type { BigActionInput } from "@acutehimanshu/core/domain/admin-audit"
import type { Page } from "@acutehimanshu/core/types/page"
import type {
  AdminOrderDetail,
  AdminOrderFilter,
  AdminOrderRow,
} from "@acutehimanshu/core/domain/admin-orders"
import { api } from "@/lib/api"

export type OrderFilter = { status: AdminOrderFilter; q: string; page: number }

export const orderKeys = {
  all: ["admin", "orders"] as const,
  list: (filter: OrderFilter) => [...orderKeys.all, "list", filter] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
}

export function listOrders(
  filter: OrderFilter,
  options?: { signal?: AbortSignal }
): Promise<Page<AdminOrderRow>> {
  const params = new URLSearchParams({ status: filter.status, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get(`/admin/orders?${params}`, options)
}

export function getOrder(id: string, options?: { signal?: AbortSignal }) {
  return api.get<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`, options)
}

export function cancelOrder(id: string, input: BigActionInput) {
  return api.post<AdminOrderDetail>(
    `/admin/orders/${encodeURIComponent(id)}/cancel`,
    input
  )
}
