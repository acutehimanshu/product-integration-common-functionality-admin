import { currencyExponent, toMinorUnits } from "@acutehimanshu/core/money"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import type { Money } from "@acutehimanshu/core/types/money"
import {
  limitKeysFor,
  LIMITS,
  type CatalogStatus,
  type CreditPack,
  type CreditPackInput,
  type LimitKey,
  type Plan,
  type PlanInput,
  type PlanSide,
} from "@acutehimanshu/core/domain/subscriptions"

// What the package and credit-pack forms hold (text, as typed) and how it
// becomes the API's shape — component-free, so it's unit-tested. Prices are
// typed in major units ("499") and sent as Money in minor units.

export type PriceDraft = { country: string; monthly: string; yearly: string }

export type PlanDraft = {
  name: string
  description: string
  badge: string
  status: CatalogStatus
  order: string
  prices: PriceDraft[]
  monthlyCredits: string
  limits: Partial<Record<LimitKey, { unlimited: boolean; value: string }>>
  /** "" = the marketplace fee. */
  feePercent: string
  sellerBadge: boolean
  shopProfile: boolean
  customShopUrl: boolean
  /** One bullet per line. */
  features: string
  trialDays: string
}

const major = (money: Money | null | undefined) =>
  money ? String(money.amount / 10 ** currencyExponent(money.currency)) : ""

export function planToDraft(plan: Plan | null, side: PlanSide): PlanDraft {
  return {
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    badge: plan?.badge ?? "",
    status: plan?.status ?? "draft",
    order: String(plan?.order ?? 10),
    prices: (plan?.prices ?? []).map((row) => ({
      country: row.country,
      monthly: major(row.monthly),
      yearly: major(row.yearly),
    })),
    monthlyCredits: String(plan?.monthlyCredits ?? 0),
    limits: Object.fromEntries(
      limitKeysFor(side).map((key) => {
        // A new package starts with every limit empty, to be filled in.
        if (!plan) return [key, { unlimited: false, value: "" }]
        const value = plan.limits[key]
        return [
          key,
          value === null || value === undefined
            ? { unlimited: true, value: "" }
            : { unlimited: false, value: String(value) },
        ]
      })
    ),
    feePercent: plan?.perks.feePercent == null ? "" : String(plan.perks.feePercent),
    sellerBadge: plan?.perks.sellerBadge ?? false,
    shopProfile: plan?.perks.shopProfile ?? false,
    customShopUrl: plan?.perks.customShopUrl ?? false,
    features: (plan?.features ?? []).join("\n"),
    trialDays: String(plan?.trialDays ?? 0),
  }
}

const wholeNumber = (text: string, min = 0): number | null => {
  const value = Number(text.trim())
  return text.trim() !== "" && Number.isInteger(value) && value >= min ? value : null
}

function money(text: string, currency: string): Money | null {
  const value = Number(text.trim())
  if (text.trim() === "" || !Number.isFinite(value) || value <= 0) return null
  return { amount: toMinorUnits(value, currency), currency }
}

function currencyOf(country: string, countries: SupportedCountry[]): string | null {
  return countries.find((c) => c.code === country)?.currency ?? null
}

/** A section's value, or the problem to show. */
type Checked<T> = { value: T } | { problem: string }

const problem = (text: string): { problem: string } => ({ problem: text })

function numbersOf(
  draft: PlanDraft
): Checked<{ order: number; monthlyCredits: number; trialDays: number }> {
  const order = wholeNumber(draft.order)
  if (order === null) return problem("Position: enter a whole number (0 or more).")
  const monthlyCredits = wholeNumber(draft.monthlyCredits)
  if (monthlyCredits === null)
    return problem("Credits each month: enter a whole number (0 or more).")
  const trialDays = wholeNumber(draft.trialDays)
  if (trialDays === null || trialDays > 90) return problem("Free trial: 0 to 90 days.")
  return { value: { order, monthlyCredits, trialDays } }
}

function limitsOf(draft: PlanDraft, side: PlanSide): Checked<PlanInput["limits"]> {
  const limits: PlanInput["limits"] = {}
  for (const key of limitKeysFor(side)) {
    const row = draft.limits[key]
    if (!row || row.unlimited) {
      limits[key] = null
      continue
    }
    const value = wholeNumber(row.value)
    if (value === null)
      return problem(`${LIMITS[key].label}: enter a number, or tick Unlimited.`)
    limits[key] = value
  }
  return { value: limits }
}

function priceRowOf(
  row: PriceDraft,
  countries: SupportedCountry[]
): Checked<PlanInput["prices"][number]> {
  const currency = currencyOf(row.country, countries)
  if (!currency) return problem("Choose a country for every price row.")
  const monthly = money(row.monthly, currency)
  if (!monthly) return problem(`Enter a monthly price for ${row.country}.`)
  const yearly = row.yearly.trim() ? money(row.yearly, currency) : null
  if (row.yearly.trim() && !yearly)
    return problem(`Yearly price for ${row.country}: enter an amount above 0.`)
  return { value: { country: row.country, monthly, yearly } }
}

function pricesOf(
  draft: PlanDraft,
  countries: SupportedCountry[]
): Checked<PlanInput["prices"]> {
  const prices: PlanInput["prices"] = []
  for (const row of draft.prices) {
    const checked = priceRowOf(row, countries)
    if ("problem" in checked) return checked
    prices.push(checked.value)
  }
  if (new Set(prices.map((p) => p.country)).size !== prices.length)
    return problem("Each country can have only one price row.")
  if (draft.status === "published" && prices.length === 0)
    return problem("Add a price for at least one country before publishing.")
  return { value: prices }
}

function feePercentOf(draft: PlanDraft, side: PlanSide): Checked<number | null> {
  if (side !== "seller" || draft.feePercent.trim() === "") return { value: null }
  const feePercent = Number(draft.feePercent)
  if (!(feePercent >= 0 && feePercent <= 50))
    return problem("Platform fee: 0 to 50 percent, or leave it empty.")
  return { value: feePercent }
}

function featuresOf(draft: PlanDraft): Checked<string[]> {
  const features = draft.features
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (features.length > 12) return problem("Up to 12 feature lines.")
  if (features.some((line) => line.length > 80))
    return problem("Keep each feature line under 80 characters.")
  return { value: features }
}

/** The form → PlanInput, or the first problem to show. */
export function draftToPlan(
  draft: PlanDraft,
  side: PlanSide,
  countries: SupportedCountry[],
  isFree: boolean
): PlanInput | string {
  if (draft.name.trim().length < 2) return "Enter a package name."
  const numbers = numbersOf(draft)
  if ("problem" in numbers) return numbers.problem
  const limits = limitsOf(draft, side)
  if ("problem" in limits) return limits.problem
  const prices = isFree ? { value: [] } : pricesOf(draft, countries)
  if ("problem" in prices) return prices.problem
  const feePercent = feePercentOf(draft, side)
  if ("problem" in feePercent) return feePercent.problem
  const features = featuresOf(draft)
  if ("problem" in features) return features.problem

  const seller = side === "seller"
  return {
    side,
    name: draft.name.trim(),
    description: draft.description.trim(),
    badge: draft.badge.trim() || null,
    status: isFree ? "published" : draft.status,
    order: numbers.value.order,
    prices: prices.value,
    monthlyCredits: numbers.value.monthlyCredits,
    limits: limits.value,
    perks: {
      feePercent: feePercent.value,
      sellerBadge: seller && draft.sellerBadge,
      shopProfile: seller && draft.shopProfile,
      customShopUrl: seller && draft.customShopUrl,
    },
    features: features.value,
    trialDays: isFree ? 0 : numbers.value.trialDays,
  }
}

export type PackDraft = {
  name: string
  credits: string
  bonusCredits: string
  prices: Array<{ country: string; price: string }>
  validityMonths: string
  badge: string
  status: CatalogStatus
  order: string
}

export function packToDraft(pack: CreditPack | null): PackDraft {
  return {
    name: pack?.name ?? "",
    credits: String(pack?.credits ?? ""),
    bonusCredits: String(pack?.bonusCredits ?? 0),
    prices: (pack?.prices ?? []).map((row) => ({
      country: row.country,
      price: major(row.price),
    })),
    validityMonths: String(pack?.validityMonths ?? 12),
    badge: pack?.badge ?? "",
    status: pack?.status ?? "draft",
    order: String(pack?.order ?? 10),
  }
}

export function draftToPack(
  draft: PackDraft,
  side: PlanSide,
  countries: SupportedCountry[]
): CreditPackInput | string {
  if (draft.name.trim().length < 2) return "Enter a pack name."
  const credits = wholeNumber(draft.credits, 1)
  if (credits === null) return "Credits: enter a whole number of at least 1."
  const bonusCredits = wholeNumber(draft.bonusCredits)
  if (bonusCredits === null) return "Bonus credits: enter a whole number (0 or more)."
  const validityMonths = wholeNumber(draft.validityMonths, 1)
  if (validityMonths === null || validityMonths > 60)
    return "Credits last: 1 to 60 months."
  const order = wholeNumber(draft.order)
  if (order === null) return "Position: enter a whole number (0 or more)."
  const prices: CreditPackInput["prices"] = []
  for (const row of draft.prices) {
    const currency = currencyOf(row.country, countries)
    if (!currency) return "Choose a country for every price row."
    const price = money(row.price, currency)
    if (!price) return `Enter a price for ${row.country}.`
    prices.push({ country: row.country, price })
  }
  if (new Set(prices.map((p) => p.country)).size !== prices.length) {
    return "Each country can have only one price row."
  }
  if (draft.status === "published" && prices.length === 0) {
    return "Add a price for at least one country before publishing."
  }
  return {
    side,
    name: draft.name.trim(),
    credits,
    bonusCredits,
    prices,
    validityMonths,
    badge: draft.badge.trim() || null,
    status: draft.status,
    order,
  }
}
