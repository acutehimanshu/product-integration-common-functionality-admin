import { describe, expect, it } from "vitest"
import { parseAdjustment } from "@/modules/payouts/ledger"

describe("ledger adjustments", () => {
  it("reads signed amounts in major units", () => {
    expect(parseAdjustment("12.50", "AUD")).toBe(1250)
    expect(parseAdjustment("-5", "AUD")).toBe(-500)
    expect(parseAdjustment("0", "AUD")).toBeNull()
    expect(parseAdjustment("abc", "AUD")).toBeNull()
  })
})
