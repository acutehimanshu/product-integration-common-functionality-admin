import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getByPath, renderScreen } from "@/test-render"
import { Marketing } from "@/modules/content/marketing"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api", () => ({
  api,
  getErrorMessage: (_: unknown, fallback: string) => fallback,
}))

const at = "2026-10-12T00:00:00.000Z"
const fixtures = {
  "/admin/marketing/requests": [
    {
      id: "msr-1",
      serviceId: "svc-product",
      serviceName: "Promote a product",
      kind: "product_promotion",
      sellerId: "u-kavya",
      shopName: "Kavya Crafts",
      country: "AU",
      listingId: "l-1",
      listingTitle: "Teapot",
      message: "Please feature it",
      credits: 20,
      status: "requested",
      history: [{ at, status: "requested", by: "Kavya Crafts", note: "Asked" }],
      campaignId: "cmp-1",
      createdAt: at,
    },
  ],
  "/admin/marketing/campaigns": [
    {
      id: "cmp-1",
      name: "Spring teapots",
      objective: "sales",
      status: "active",
      owner: { id: "a-1", name: "Ops" },
      country: "AU",
      startsAt: at,
      endsAt: "2026-10-19T00:00:00.000Z",
      placements: ["home_promoted", "search_top"],
      targeting: { listingIds: ["l-1"], sellerIds: [], categoryIds: [] },
      targetingVersions: [
        {
          listingIds: ["l-1"],
          sellerIds: [],
          categoryIds: [],
          version: 1,
          at,
          by: "Ops",
        },
      ],
      stats: { impressions: 10, clicks: 2 },
      conflicts: [{ placementId: "search_top", campaignIds: ["cmp-2"], slots: 2 }],
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "cmp-2",
      name: "Paused shops",
      objective: "seller_growth",
      status: "paused",
      pausedReason: "Stock issue",
      owner: { id: "a-1", name: "Ops" },
      country: "AU",
      startsAt: at,
      endsAt: at,
      placements: ["home_shops"],
      targeting: { listingIds: [], sellerIds: ["u-kavya"], categoryIds: [] },
      targetingVersions: [],
      stats: { impressions: 0, clicks: 0 },
      conflicts: [],
      createdAt: at,
      updatedAt: at,
    },
  ],
  "/admin/marketing/emails": [
    {
      id: "mem-1",
      subject: "Spring deals",
      body: "Fresh deals",
      audience: { country: "AU", who: "buyers" },
      status: "draft",
      stats: {
        recipients: 4,
        sent: 0,
        delivered: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        suppressed: 1,
      },
      createdBy: "Ops",
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "mem-2",
      subject: "Weekend sale",
      body: "Ends Sunday",
      audience: { country: "AU", who: "everyone" },
      status: "scheduled",
      scheduledAt: at,
      stats: {
        recipients: 3,
        sent: 0,
        delivered: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        suppressed: 0,
      },
      createdBy: "Ops",
      createdAt: at,
      updatedAt: at,
    },
  ],
  "/admin/marketing/services": [
    {
      id: "svc-product",
      kind: "product_promotion",
      name: "Promote a product",
      description: "Seven days on the home page",
      credits: 20,
      days: 7,
      countries: ["AU"],
      planIds: [],
      sellerTypes: [],
      active: true,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "svc-seo",
      kind: "seo_content",
      name: "Copy review",
      description: "Better titles",
      credits: 15,
      days: 0,
      countries: [],
      planIds: [],
      sellerTypes: [],
      active: false,
      createdAt: at,
      updatedAt: at,
    },
  ],
  "/admin/marketing/suppressions": [{ email: "gone@example.com", reason: "bounced", at }],
}

beforeEach(() => {
  api.get.mockImplementation(getByPath(fixtures))
  api.post.mockResolvedValue({})
  api.put.mockResolvedValue({})
})

const open = (tab: string) => renderScreen(<Marketing />, `/${tab}`)

describe("Admin marketing", () => {
  it("lists requests with their history and lets an admin move one on", async () => {
    const user = userEvent.setup()
    open("")
    expect(
      await screen.findByText(/Promote a product — Kavya Crafts/)
    ).toBeInTheDocument()
    expect(screen.getByText(/“Please feature it”/)).toBeInTheDocument()
    expect(screen.getByText(/Requested by Kavya Crafts: Asked/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Approved: Promote a product/ }))
    await user.type(
      screen.getByLabelText("Note to the seller (optional)"),
      "Booked for next week"
    )
    await user.type(screen.getByLabelText("Reason"), "Fits the spring plan")
    await user.click(screen.getByRole("button", { name: "Approved" }))
    expect(api.post).toHaveBeenCalledWith("/admin/marketing/requests/msr-1/status", {
      status: "approved",
      reason: "Fits the spring plan",
      note: "Booked for next week",
    })
  })

  it("shows campaigns with reach, conflicts and the actions their status allows", async () => {
    const user = userEvent.setup()
    open("campaigns")
    expect(await screen.findByText("Spring teapots")).toBeInTheDocument()
    expect(screen.getByText(/10 shown,/)).toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(
      /Top of search results \(2 slots\)/
    )
    expect(screen.getByText(/paused: Stock issue/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Pause Spring teapots" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Resume Paused shops" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Pause Spring teapots" }))
    await user.type(screen.getByLabelText("Reason"), "Seller out of stock")
    await user.click(screen.getByRole("button", { name: "Pause" }))
    expect(api.post).toHaveBeenCalledWith("/admin/marketing/campaigns/cmp-1/pause", {
      reason: "Seller out of stock",
    })
  })

  it("creates a draft campaign from the form", async () => {
    const user = userEvent.setup()
    open("campaigns")
    await user.click(await screen.findByRole("button", { name: "New campaign" }))
    await user.type(screen.getByLabelText("Name"), "Winter mugs")
    await user.type(screen.getByLabelText("Starts"), "2026-11-01T09:00")
    await user.type(screen.getByLabelText("Ends"), "2026-11-08T09:00")
    await user.click(screen.getByLabelText(/Top of search results/))
    await user.type(screen.getByLabelText("Listing ids (comma-separated)"), "l-1, l-2")
    await user.type(screen.getByLabelText("Reason"), "Winter range launch")
    await user.click(screen.getByRole("button", { name: "Save draft" }))
    expect(api.post).toHaveBeenCalledWith(
      "/admin/marketing/campaigns",
      expect.objectContaining({
        name: "Winter mugs",
        placements: ["home_promoted", "search_top"],
        targeting: { listingIds: ["l-1", "l-2"], sellerIds: [], categoryIds: [] },
      })
    )
  })

  it("shows marketing email with its numbers and sends a test", async () => {
    const user = userEvent.setup()
    open("emails")
    expect(await screen.findByText("Spring deals")).toBeInTheDocument()
    expect(screen.getByText(/4 recipients/)).toBeInTheDocument()
    expect(screen.getByText(/Scheduled/, { selector: "p" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Send a test of Spring deals" }))
    await user.type(screen.getByLabelText("Send to"), "me@marketbase.test")
    await user.type(screen.getByLabelText("Reason"), "Checking the layout")
    await user.click(screen.getByRole("button", { name: "Send test" }))
    expect(api.post).toHaveBeenCalledWith("/admin/marketing/emails/mem-1/test", {
      to: "me@marketbase.test",
    })
  })

  it("lists services and the suppression list", async () => {
    open("services")
    expect(await screen.findByText("Promote a product")).toBeInTheDocument()
    expect(screen.getByText("Off")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit Copy review" })).toBeInTheDocument()
    open("suppressions")
    expect(await screen.findByText("gone@example.com")).toBeInTheDocument()
    expect(screen.getByText("Bounced")).toBeInTheDocument()
  })

  it("edits a service and schedules an email", async () => {
    const user = userEvent.setup()
    const services = open("services")
    await user.click(await screen.findByRole("button", { name: "Edit Copy review" }))
    expect(screen.getByLabelText("Name")).toHaveValue("Copy review")
    await user.clear(screen.getByLabelText("Credits"))
    await user.type(screen.getByLabelText("Credits"), "10")
    await user.click(screen.getByLabelText("Offered"))
    await user.type(screen.getByLabelText("Reason"), "Cheaper for launch")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(api.put).toHaveBeenCalledWith(
      "/admin/marketing/services/svc-seo",
      expect.objectContaining({ credits: 10, active: true, kind: "seo_content" })
    )
    services.unmount()

    open("emails")
    await user.click(
      await screen.findByRole("button", { name: "Send or schedule Spring deals" })
    )
    await user.type(screen.getByLabelText("Reason"), "Spring campaign go-live")
    await user.click(screen.getByRole("button", { name: "Confirm" }))
    expect(api.post).toHaveBeenCalledWith("/admin/marketing/emails/mem-1/schedule", {
      reason: "Spring campaign go-live",
      at: undefined,
    })
  })
})
