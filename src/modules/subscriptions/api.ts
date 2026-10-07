import type { Page } from "@acutehimanshu/core/types/page"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import type {
  AdminCreditPack,
  AdminPlan,
  AdminPlanDetail,
  AdminSubscriber,
  AdminSubscriberDetail,
  AdminSubscriptionOverview,
  CreditCost,
  CreditPack,
  CreditPackInput,
  PlanInput,
  PlanSide,
  SubscriptionSettings,
} from "@acutehimanshu/core/domain/subscriptions"
import type { BigActionInput } from "@acutehimanshu/core/domain/admin-audit"
import { api } from "@/lib/api"

type Options = { signal?: AbortSignal }

export type SubscriberFilter = { side: PlanSide; q: string; page: number }

export const subscriptionKeys = {
  all: ["admin", "subscriptions"] as const,
  overview: () => [...subscriptionKeys.all, "overview"] as const,
  plans: (side: PlanSide) => [...subscriptionKeys.all, "plans", side] as const,
  plan: (id: string) => [...subscriptionKeys.all, "plan", id] as const,
  packs: (side: PlanSide) => [...subscriptionKeys.all, "packs", side] as const,
  pack: (id: string) => [...subscriptionKeys.all, "pack", id] as const,
  subscribers: (filter: SubscriberFilter) =>
    [...subscriptionKeys.all, "subscribers", filter] as const,
  subscriber: (side: PlanSide, userId: string) =>
    [...subscriptionKeys.all, "subscriber", side, userId] as const,
  countries: () => ["admin", "countries"] as const,
}

export const getOverview = (options?: Options) =>
  api.get<AdminSubscriptionOverview>("/admin/subscriptions", options)

export const saveSettings = (settings: SubscriptionSettings, input: BigActionInput) =>
  api.put<AdminSubscriptionOverview>("/admin/subscriptions/settings", {
    settings,
    ...input,
  })

export const saveCosts = (costs: CreditCost[], input: BigActionInput) =>
  api.put<AdminSubscriptionOverview>("/admin/credit-costs", { costs, ...input })

export const listPlans = (side: PlanSide, options?: Options) =>
  api.get<AdminPlan[]>(`/admin/plans?side=${side}`, options)

export const getPlan = (id: string, options?: Options) =>
  api.get<AdminPlanDetail>(`/admin/plans/${encodeURIComponent(id)}`, options)

export const createPlan = (side: PlanSide, plan: PlanInput, reason: string) =>
  api.post<AdminPlanDetail>("/admin/plans", { side, plan, reason })

export const updatePlan = (id: string, plan: PlanInput, input: BigActionInput) =>
  api.patch<AdminPlanDetail>(`/admin/plans/${encodeURIComponent(id)}`, { plan, ...input })

export const listPacks = (side: PlanSide, options?: Options) =>
  api.get<CreditPack[]>(`/admin/credit-packs?side=${side}`, options)

export const getPack = (id: string, options?: Options) =>
  api.get<AdminCreditPack>(`/admin/credit-packs/${encodeURIComponent(id)}`, options)

export const createPack = (side: PlanSide, pack: CreditPackInput, reason: string) =>
  api.post<AdminCreditPack>("/admin/credit-packs", { side, pack, reason })

export const updatePack = (id: string, pack: CreditPackInput, input: BigActionInput) =>
  api.patch<AdminCreditPack>(`/admin/credit-packs/${encodeURIComponent(id)}`, {
    pack,
    ...input,
  })

export function listSubscribers(filter: SubscriberFilter, options?: Options) {
  const params = new URLSearchParams({ side: filter.side, page: String(filter.page) })
  if (filter.q) params.set("q", filter.q)
  return api.get<Page<AdminSubscriber>>(`/admin/subscribers?${params}`, options)
}

export const getSubscriber = (side: PlanSide, userId: string, options?: Options) =>
  api.get<AdminSubscriberDetail>(
    `/admin/subscribers/${encodeURIComponent(userId)}?side=${side}`,
    options
  )

export const adjustCredits = (
  side: PlanSide,
  userId: string,
  credits: number,
  input: BigActionInput
) =>
  api.post<AdminSubscriberDetail>(
    `/admin/subscribers/${encodeURIComponent(userId)}/credits`,
    { side, credits, ...input }
  )

/** The marketplace's countries and their currencies (for price rows). */
export const listCountries = (options?: Options) =>
  api.get<SupportedCountry[]>("/countries", options)
