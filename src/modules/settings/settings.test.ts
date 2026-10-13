import { describe, expect, it } from "vitest"
import { countryProfileProblem } from "@acutehimanshu/core/domain/country-profile"
import type { AdminCountry } from "@acutehimanshu/core/domain/country-profile"
import { parseCurrencies, toInput } from "@/modules/settings/country-editor"
import { moveItem } from "@/lib/move-item"

const au: AdminCountry = {
  code: "AU",
  name: "Australia",
  currency: "AUD",
  sellingEnabled: true,
  timeZone: "Australia/Sydney",
  status: "live",
  buyersCanRegister: true,
  crossBorder: false,
  loginChannels: ["email", "sms"],
  extraCurrencies: ["USD"],
  tax: { label: "GST", ratePercent: 10, confirmed: false },
  support: { hours: "", email: null, phone: null },
  providers: { payment: null, shipping: null, tax: null, verification: null },
  history: [],
  legal: [],
  readiness: { problems: [], warnings: [] },
  refusals: [],
}

describe("country editor", () => {
  it("edits everything but the code, name, history and legal pages", () => {
    const input = toInput(au)
    expect(input).not.toHaveProperty("code")
    expect(input).not.toHaveProperty("legal")
    expect(countryProfileProblem(input, "AU")).toBeNull()
  })

  it("reads other currencies from a comma list", () => {
    expect(parseCurrencies(" usd, eur ,")).toEqual(["USD", "EUR"])
  })

  it("won't open selling or sign-up where the country is off", () => {
    expect(countryProfileProblem({ ...toInput(au), status: "off" }, "AU")).toMatch(/off/)
    expect(
      countryProfileProblem({ ...toInput(au), status: "coming_soon" }, "AU")
    ).toMatch(/live or pilot/)
  })
})

describe("messaging order", () => {
  it("moves a provider up, and leaves the first where it is", () => {
    // Up the list = to the index before (index 0 = tried first).
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"])
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"])
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
  })
})
