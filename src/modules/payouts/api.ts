import type { BigActionInput } from "@acutehimanshu/core/domain/admin-audit"
import type {
  AdminPayoutDetail,
  AdminPayoutList,
  PayoutFilter,
} from "@acutehimanshu/core/domain/admin-payouts"
import { api } from "@/lib/api"

export type PayoutListFilter = { status: PayoutFilter; q: string; page: number }

export const payoutKeys = {
  all: ["admin", "payouts"] as const,
  list: (filter: PayoutListFilter) => [...payoutKeys.all, "list", filter] as const,
  detail: (sellerId: string) => [...payoutKeys.all, "detail", sellerId] as const,
}

export function listPayouts(
  filter: PayoutListFilter,
  options?: { signal?: AbortSignal }
): Promise<AdminPayoutList> {
  const params = new URLSearchParams({ status: filter.status, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get(`/admin/payouts?${params}`, options)
}

export function getPayouts(sellerId: string, options?: { signal?: AbortSignal }) {
  return api.get<AdminPayoutDetail>(
    `/admin/payouts/${encodeURIComponent(sellerId)}`,
    options
  )
}

export function holdPayouts(sellerId: string, input: BigActionInput) {
  return api.post<AdminPayoutDetail>(
    `/admin/payouts/${encodeURIComponent(sellerId)}/hold`,
    input
  )
}

export function releasePayouts(sellerId: string, input: BigActionInput) {
  return api.post<AdminPayoutDetail>(
    `/admin/payouts/${encodeURIComponent(sellerId)}/release`,
    input
  )
}
