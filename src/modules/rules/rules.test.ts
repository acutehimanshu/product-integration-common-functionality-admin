import { describe, expect, it } from "vitest"
import { startOf, toScope } from "@/modules/rules/rules-screen"

describe("rules screen", () => {
  it("turns empty scope fields into 'any'", () => {
    expect(
      toScope({ country: "AU", categoryId: "", sellerType: "", sellerId: " " })
    ).toEqual({
      country: "AU",
      categoryId: null,
      sellerType: null,
      sellerId: null,
    })
  })

  it("starts now when no date is chosen", () => {
    expect(startOf("")).toBeUndefined()
    expect(startOf("2026-10-20T09:00")).toMatch(/^2026-10-(19|20)T/)
  })
})
