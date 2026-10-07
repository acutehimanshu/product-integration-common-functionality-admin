import type { Page } from "@acutehimanshu/core/types/page"
import type {
  ModerationDetail,
  ModerationInput,
  ModerationItem,
} from "@acutehimanshu/core/domain/admin-moderation"
import { api } from "@/lib/api"

export type ModerationFilter = {
  state: "open" | "resolved" | "all"
  q: string
  page: number
}

export const moderationKeys = {
  all: ["admin", "moderation"] as const,
  list: (filter: ModerationFilter) => [...moderationKeys.all, "list", filter] as const,
  detail: (id: string) => [...moderationKeys.all, "detail", id] as const,
}

export function listReported(
  filter: ModerationFilter,
  options?: { signal?: AbortSignal }
): Promise<Page<ModerationItem>> {
  const params = new URLSearchParams({ state: filter.state, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get(`/admin/moderation/listings?${params}`, options)
}

export function getReported(id: string, options?: { signal?: AbortSignal }) {
  return api.get<ModerationDetail>(
    `/admin/moderation/listings/${encodeURIComponent(id)}`,
    options
  )
}

export function moderate(id: string, input: ModerationInput) {
  return api.post<ModerationItem>(
    `/admin/moderation/listings/${encodeURIComponent(id)}`,
    input
  )
}
