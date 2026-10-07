import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { describe, expect, it } from "vitest"
import type { Plan } from "@acutehimanshu/core/domain/subscriptions"
import {
  draftToPack,
  draftToPlan,
  packToDraft,
  planToDraft,
} from "@/modules/subscriptions/forms"

const countries: SupportedCountry[] = [
  {
    code: "IN",
    name: "India",
    currency: "INR",
    sellingEnabled: true,
    timeZone: "Australia/Sydney",
    status: "live",
    buyersCanRegister: true,
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    sellingEnabled: false,
    timeZone: "Europe/London",
    status: "live",
    buyersCanRegister: true,
  },
]

const pro: Plan = {
  id: "plan-seller-pro",
  side: "seller",
  name: "Pro",
  description: "For shops.",
  badge: "Most popular",
  isFree: false,
  status: "published",
  order: 2,
  prices: [
    {
      country: "IN",
      monthly: { amount: 149900, currency: "INR" },
      yearly: { amount: 1499000, currency: "INR" },
    },
  ],
  monthlyCredits: 200,
  limits: { active_listings: 500, quotes_per_month: null },
  perks: { feePercent: 6, sellerBadge: true, shopProfile: true, customShopUrl: false },
  features: ["Unlimited quotes", "Pro badge"],
  trialDays: 14,
  updatedAt: "2026-09-29T00:00:00.000Z",
}

describe("package form", () => {
  it("round-trips a package: major units in the form, minor units out", () => {
    const draft = planToDraft(pro, "seller")
    expect(draft.prices[0]).toEqual({ country: "IN", monthly: "1499", yearly: "14990" })
    expect(draft.limits.quotes_per_month).toEqual({ unlimited: true, value: "" })
    expect(draft.features).toBe("Unlimited quotes\nPro badge")

    const input = draftToPlan(draft, "seller", countries, false)
    expect(input).toMatchObject({
      name: "Pro",
      prices: pro.prices,
      limits: pro.limits,
      perks: pro.perks,
      features: pro.features,
      trialDays: 14,
    })
  })

  it("prices a new country in its own currency", () => {
    const draft = planToDraft(pro, "seller")
    draft.prices.push({ country: "GB", monthly: "12.99", yearly: "" })
    const input = draftToPlan(draft, "seller", countries, false)
    expect(typeof input === "string" ? input : input.prices[1]).toEqual({
      country: "GB",
      monthly: { amount: 1299, currency: "GBP" },
      yearly: null,
    })
  })

  it("explains what's missing", () => {
    const blank = planToDraft(null, "seller")
    expect(draftToPlan(blank, "seller", countries, false)).toBe("Enter a package name.")
    blank.name = "Starter"
    expect(draftToPlan(blank, "seller", countries, false)).toBe(
      "Active listings: enter a number, or tick Unlimited."
    )
    blank.limits = {
      active_listings: { unlimited: false, value: "50" },
      quotes_per_month: { unlimited: true, value: "" },
    }
    blank.status = "published"
    expect(draftToPlan(blank, "seller", countries, false)).toBe(
      "Add a price for at least one country before publishing."
    )
    blank.status = "draft"
    expect(typeof draftToPlan(blank, "seller", countries, false)).toBe("object")
  })

  it("keeps the Free package free and published", () => {
    const draft = planToDraft(
      { ...pro, isFree: true, prices: [], trialDays: 0 },
      "seller"
    )
    draft.status = "hidden"
    draft.trialDays = "30"
    const input = draftToPlan(draft, "seller", countries, true)
    expect(input).toMatchObject({ status: "published", prices: [], trialDays: 0 })
  })

  it("drops seller-only perks on buyer packages", () => {
    const draft = planToDraft(null, "buyer")
    draft.name = "Plus"
    draft.limits = { open_requests: { unlimited: false, value: "15" } }
    draft.feePercent = "5"
    draft.sellerBadge = true
    const input = draftToPlan(draft, "buyer", countries, false)
    expect(input).toMatchObject({ perks: { feePercent: null, sellerBadge: false } })
  })
})

describe("credit pack form", () => {
  it("builds a pack and checks its numbers", () => {
    const draft = packToDraft(null)
    draft.name = "Value"
    expect(draftToPack(draft, "seller", countries)).toBe(
      "Credits: enter a whole number of at least 1."
    )
    draft.credits = "200"
    draft.bonusCredits = "20"
    draft.prices = [{ country: "IN", price: "999" }]
    draft.status = "published"
    expect(draftToPack(draft, "seller", countries)).toMatchObject({
      credits: 200,
      bonusCredits: 20,
      prices: [{ country: "IN", price: { amount: 99900, currency: "INR" } }],
      validityMonths: 12,
    })
  })
})
