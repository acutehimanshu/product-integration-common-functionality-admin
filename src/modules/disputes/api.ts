import type { Page } from "@acutehimanshu/core/types/page"
import type {
  DisputeDecisionInput,
  DisputeDetail,
  DisputeFilter,
  DisputeRow,
} from "@acutehimanshu/core/domain/admin-disputes"
import { api } from "@/lib/api"

export type DisputeListFilter = { status: DisputeFilter; q: string; page: number }

export const disputeKeys = {
  all: ["admin", "disputes"] as const,
  list: (filter: DisputeListFilter) => [...disputeKeys.all, "list", filter] as const,
  detail: (id: string) => [...disputeKeys.all, "detail", id] as const,
}

export function listDisputes(
  filter: DisputeListFilter,
  options?: { signal?: AbortSignal }
): Promise<Page<DisputeRow>> {
  const params = new URLSearchParams({ status: filter.status, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get(`/admin/disputes?${params}`, options)
}

export function getDispute(id: string, options?: { signal?: AbortSignal }) {
  return api.get<DisputeDetail>(`/admin/disputes/${encodeURIComponent(id)}`, options)
}

/** Close a return the seller never confirmed: the buyer is refunded. */
export function closeReturn(id: string, reason: string) {
  return api.post<DisputeDetail>(
    `/admin/disputes/${encodeURIComponent(id)}/return-received`,
    { reason }
  )
}

export function decideDispute(id: string, input: DisputeDecisionInput) {
  return api.post<DisputeDetail>(
    `/admin/disputes/${encodeURIComponent(id)}/decide`,
    input
  )
}
