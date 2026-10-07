import { describe, expect, it } from "vitest"
import { cellLabel } from "@/modules/reports/page"

describe("report cells", () => {
  it("shows money, percentages, dates and empties", () => {
    expect(cellLabel({ amount: 1250, currency: "AUD" }, "money")).toContain("12.50")
    expect(cellLabel(33.333, "percent")).toBe("33.3%")
    expect(cellLabel(null, "text")).toBe("—")
    expect(cellLabel("2026-10-05T01:00:00.000Z", "date")).toMatch(/2026/)
  })
})
