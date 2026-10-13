import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getByPath, renderScreen } from "@/test-render"
import {
  ExportButtons,
  MyExports,
  ReportNotes,
  SavedViews,
} from "@/modules/reports/report-tools"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
const downloadCsv = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api", () => ({
  api,
  downloadCsv,
  getErrorMessage: (_: unknown, fallback: string) => fallback,
}))

const at = "2026-10-12T00:00:00.000Z"

beforeEach(() => {
  api.post.mockResolvedValue({ status: "ready" })
  downloadCsv.mockResolvedValue(undefined)
})

describe("Report tools", () => {
  it("downloads Excel and keeps an export", async () => {
    const user = userEvent.setup()
    api.get.mockImplementation(getByPath({}))
    renderScreen(<ExportButtons id="sales" query="country=AU" />)
    await user.click(screen.getByRole("button", { name: "Download Excel" }))
    expect(downloadCsv).toHaveBeenCalledWith(
      "/admin/reports/sales/export?country=AU&format=xlsx",
      "marketbase-sales.xlsx"
    )
    await user.click(screen.getByRole("button", { name: "Keep an export" }))
    expect(api.post).toHaveBeenCalledWith("/admin/reports/sales/exports", {
      format: "xlsx",
      filters: { country: "AU" },
    })
  })

  it("lists exports with their state and downloads a ready one", async () => {
    const user = userEvent.setup()
    const job = (over: object) => ({
      id: "exp-1",
      reportId: "sales",
      format: "xlsx",
      filters: {},
      status: "ready",
      rowCount: 12,
      maskedColumns: ["Buyer email"],
      createdBy: { id: "a-1", name: "Ops" },
      createdAt: at,
      expiresAt: at,
      downloads: 0,
      ...over,
    })
    api.get.mockImplementation(
      getByPath({
        "/admin/exports": [
          job({}),
          job({ id: "exp-2", status: "queued", maskedColumns: [] }),
        ],
      })
    )
    renderScreen(<MyExports />)
    expect(await screen.findByText(/hidden: Buyer email/)).toBeInTheDocument()
    expect(screen.getByText("Being made")).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Download Sales and orders export" })
    )
    expect(downloadCsv).toHaveBeenCalledWith(
      "/admin/exports/exp-1/download",
      "marketbase-sales.xlsx"
    )
  })

  it("shows saved views for the report and saves a shared one", async () => {
    const user = userEvent.setup()
    api.get.mockImplementation(
      getByPath({
        "/admin/report-views": [
          {
            id: "v-1",
            name: "AU only",
            reportId: "sales",
            filters: { country: "AU" },
            shared: true,
            createdBy: { id: "a", name: "A" },
            createdAt: at,
          },
          {
            id: "v-2",
            name: "Other report",
            reportId: "finance",
            filters: {},
            shared: false,
            createdBy: { id: "a", name: "A" },
            createdAt: at,
          },
        ],
      })
    )
    renderScreen(<SavedViews id="sales" query="status=paid" />)
    expect(await screen.findByRole("link", { name: "AU only (shared)" })).toHaveAttribute(
      "href",
      "/?country=AU"
    )
    expect(screen.queryByText("Other report")).toBeNull()
    await user.type(screen.getByLabelText("Save these filters as"), "Paid orders")
    await user.click(screen.getByLabelText("Share with the team"))
    await user.click(screen.getByRole("button", { name: "Save view" }))
    expect(api.post).toHaveBeenCalledWith("/admin/report-views", {
      name: "Paid orders",
      reportId: "sales",
      filters: { status: "paid" },
      shared: true,
    })
  })

  it("explains masked and estimated columns", () => {
    renderScreen(
      <ReportNotes
        maskedColumns={["Buyer email"]}
        estimated={["Credited orders", "Credited sales"]}
      />
    )
    expect(screen.getByText(/Hidden for you: Buyer email/)).toBeInTheDocument()
    expect(
      screen.getByText(/Credited orders and Credited sales are estimates/)
    ).toBeInTheDocument()
  })
})
