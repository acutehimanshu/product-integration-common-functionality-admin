import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getByPath, renderScreen } from "@/test-render"
import { PageEditor, PageList, SharedBlocks } from "@/modules/content/pages-cms"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api", () => ({
  api,
  getErrorMessage: (_: unknown, fallback: string) => fallback,
}))

const at = "2026-10-12T00:00:00.000Z"
const draft = {
  title: "Terms of use",
  blocks: [
    { type: "heading", text: "Our terms" },
    { type: "text", text: "Be nice." },
    { type: "image", url: "/uploads/a.jpg", alt: "Office" },
    { type: "cta", label: "Shop now", href: "/search" },
    { type: "product", listingId: "l-1" },
  ],
  seo: { title: "Terms", description: "The rules", noindex: true },
}
const page = {
  id: "pg-1",
  kind: "legal",
  slug: "terms",
  locale: "en-AU",
  countries: ["AU"],
  draft,
  live: { ...draft, version: 1, publishedAt: at },
  status: "pending_approval",
  version: 2,
  versions: [
    { ...draft, version: 1, at, by: "Content", note: "First" },
    { ...draft, version: 2, at, by: "Content" },
  ],
  decisions: [{ at, by: "Content", action: "submitted", version: 2, reason: "Ready" }],
  effectiveFrom: "2026-11-01T00:00:00.000Z",
  redirectsFrom: [],
  author: { id: "a-2", name: "Content" },
  createdAt: at,
  updatedAt: at,
  history: [],
}

beforeEach(() => {
  api.get.mockImplementation(
    getByPath({
      "/admin/pages/pg-1/preview": { blocks: [{}, {}], shownInCountry: false },
      "/admin/pages/pg-1": page,
      "/admin/pages": {
        items: [
          page,
          {
            ...page,
            id: "pg-2",
            kind: "static",
            slug: "about",
            status: "published",
            draft: { ...draft, title: "About" },
          },
        ],
        page: 1,
        pageSize: 20,
        total: 2,
      },
      "/admin/content-blocks": [
        {
          id: "blk-1",
          name: "Footer promo",
          blocks: [{ type: "text", text: "Hi" }],
          updatedAt: at,
        },
      ],
    })
  )
  api.post.mockResolvedValue({ id: "pg-3" })
  api.put.mockResolvedValue({})
})

describe("Admin pages", () => {
  it("lists pages with kind and status, and creates a new one", async () => {
    const user = userEvent.setup()
    renderScreen(<PageList />)
    expect(await screen.findByText("Terms of use")).toBeInTheDocument()
    expect(screen.getByText("Waiting for approval")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Address (slug)"), "spring-guide")
    await user.click(screen.getByRole("button", { name: "New page" }))
    expect(api.post).toHaveBeenCalledWith(
      "/admin/pages",
      expect.objectContaining({
        kind: "static",
        slug: "spring-guide",
        title: "spring guide",
      })
    )
  })

  it("edits a page: blocks, versions, decisions, approval actions and preview", async () => {
    const user = userEvent.setup()
    renderScreen(<PageEditor />, "/pg-1", "/:id")
    expect(
      await screen.findByRole("heading", { name: "Terms of use" })
    ).toBeInTheDocument()
    expect(screen.getByText("live: version 1")).toBeInTheDocument()
    expect(screen.getByLabelText("Takes effect on (YYYY-MM-DD)")).toHaveValue(
      "2026-11-01"
    )
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restore version 1" })).toBeInTheDocument()
    expect(screen.getByText(/Content submitted version 2: Ready/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Block type"), "campaign")
    await user.click(screen.getByRole("button", { name: "Add block" }))
    expect(screen.getByText("campaign", { selector: "legend" })).toBeInTheDocument()
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]!)
    await user.click(screen.getByRole("button", { name: "Save draft" }))
    expect(api.put).toHaveBeenCalledWith(
      "/admin/pages/pg-1",
      expect.objectContaining({
        slug: "terms",
        countries: ["AU"],
        seo: expect.objectContaining({ noindex: true }),
      })
    )

    await user.click(screen.getByRole("button", { name: "Preview in this country" }))
    expect(await screen.findByText(/Not shown in this country/)).toBeInTheDocument()
  })

  it("lists shared blocks and saves a new one", async () => {
    const user = userEvent.setup()
    renderScreen(<SharedBlocks />)
    expect(await screen.findByText(/Footer promo/)).toBeInTheDocument()
    expect(screen.getByLabelText("Block type")).not.toHaveTextContent("reusable")
    await user.type(screen.getByLabelText("New shared block name"), "Winter banner")
    await user.click(screen.getByRole("button", { name: "Add block" }))
    await user.click(screen.getByRole("button", { name: "Save shared block" }))
    await user.type(screen.getByLabelText("Reason"), "Seasonal banner")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(api.post).toHaveBeenCalledWith(
      "/admin/content-blocks",
      expect.objectContaining({ name: "Winter banner", reason: "Seasonal banner" })
    )
  })
})
