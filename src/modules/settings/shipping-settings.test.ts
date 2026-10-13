import { describe, expect, it } from "vitest"
import { DEFAULT_SHIPPING_SETTINGS } from "@acutehimanshu/core/marketplace-settings"
import { shippingDraftOf, shippingSettingsOf } from "./shipping-settings"

describe("shipping settings draft", () => {
  it("round-trips the defaults", () => {
    expect(shippingSettingsOf(shippingDraftOf(DEFAULT_SHIPPING_SETTINGS))).toEqual({
      settings: DEFAULT_SHIPPING_SETTINGS,
    })
  })

  it("reads amounts in major units and checks the percentages", () => {
    const draft = {
      ...shippingDraftOf(DEFAULT_SHIPPING_SETTINGS),
      manualCountries: "au, nz, x",
      freeOn: true,
      freeMin: "50",
      sellerShare: "25",
      highThreshold: "1000",
    }
    expect(shippingSettingsOf(draft)).toEqual({
      settings: {
        manualCountries: ["AU", "NZ"],
        freeShipping: { enabled: true, minSubtotal: 5000, sellerSharePercent: 25 },
        highValue: { threshold: 100_000, insurancePercent: 1 },
      },
    })
    expect(shippingSettingsOf({ ...draft, sellerShare: "120" })).toHaveProperty("problem")
    expect(shippingSettingsOf({ ...draft, highThreshold: "0" })).toHaveProperty("problem")
  })
})
