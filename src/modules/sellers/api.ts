import type { Page } from "@acutehimanshu/core/types/page"
import type {
  AdminSellerDetail,
  AdminSellerRow,
  SellerDecisionInput,
  SellerReviewFilter,
} from "@acutehimanshu/core/domain/admin-sellers"
import { api } from "@/lib/api"

export const sellerKeys = {
  all: ["admin", "sellers"] as const,
  list: (filter: { status: SellerReviewFilter; q: string; page: number }) =>
    [...sellerKeys.all, "list", filter] as const,
  detail: (id: string) => [...sellerKeys.all, "detail", id] as const,
}

export function listSellers(
  filter: { status: SellerReviewFilter; q: string; page: number },
  options?: { signal?: AbortSignal }
): Promise<Page<AdminSellerRow>> {
  const params = new URLSearchParams({ status: filter.status, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get(`/admin/sellers?${params}`, options)
}

export function getSeller(id: string, options?: { signal?: AbortSignal }) {
  return api.get<AdminSellerDetail>(`/admin/sellers/${encodeURIComponent(id)}`, options)
}

export function decideSeller(id: string, input: SellerDecisionInput) {
  return api.post<AdminSellerDetail>(
    `/admin/sellers/${encodeURIComponent(id)}/verification`,
    input
  )
}
