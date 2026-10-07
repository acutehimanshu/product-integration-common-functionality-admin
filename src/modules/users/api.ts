import type { BigActionInput } from "@acutehimanshu/core/domain/admin-audit"
import type { Page } from "@acutehimanshu/core/types/page"
import type {
  AdminUserDetail,
  AdminUserRow,
} from "@acutehimanshu/core/domain/admin-users"
import { api } from "@/lib/api"

export type UserFilter = {
  status: "all" | "active" | "suspended"
  q: string
  page: number
}

export const userKeys = {
  all: ["admin", "users"] as const,
  list: (filter: UserFilter) => [...userKeys.all, "list", filter] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
}

export function listUsers(
  filter: UserFilter,
  options?: { signal?: AbortSignal }
): Promise<Page<AdminUserRow>> {
  const params = new URLSearchParams({ status: filter.status, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get(`/admin/users?${params}`, options)
}

export function getUser(id: string, options?: { signal?: AbortSignal }) {
  return api.get<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`, options)
}

export function suspendUser(id: string, input: BigActionInput) {
  return api.post<AdminUserDetail>(
    `/admin/users/${encodeURIComponent(id)}/suspend`,
    input
  )
}

export function restoreUser(id: string, reason: string) {
  return api.post<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/restore`, {
    reason,
  })
}
