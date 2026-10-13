import type { ReviewFilter } from "@acutehimanshu/core/domain/admin-reviews"

export const reviewKeys = {
  all: ["admin", "reviews"] as const,
  list: (filter: { status: ReviewFilter; q: string; page: number }) =>
    [...reviewKeys.all, "list", filter] as const,
}
