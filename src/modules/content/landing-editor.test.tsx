import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_LANDING, type AdminLanding } from "@acutehimanshu/core/domain/landing"
import { getByPath, renderScreen } from "@/test-render"
import { LandingEditor } from "@/modules/content/landing-editor"

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  upload: vi.fn(),
}))
vi.mock("@/lib/api", () => ({
  api,
  getErrorMessage: (_: unknown, fallback: string) => fallback,
}))

const at = "2026-10-13T00:00:00.000Z"
const landing = (over: Partial<AdminLanding> = {}): AdminLanding => ({
  source: "builtin",
  draft: structuredClone(DEFAULT_LANDING),
  live: null,
  status: "draft",
  version: 2,
  versions: [
    { version: 1, at, by: "Marketbase", note: "Built-in Phase 1 content" },
    { version: 2, at, by: "Content" },
  ],
  decisions: [{ at, by: "Content", action: "saved", version: 2, reason: "Spring copy" }],
  approvalRequired: false,
  approvedVersion: null,
  history: [],
  ...over,
})

function setup(data: AdminLanding) {
  api.get.mockImplementation(
    getByPath({
      "/admin/content/landing": data,
      "/admin/categories": [
        { id: "cat-home", name: "Home & living", hidden: false, parentId: null },
        { id: "cat-old", name: "Old", hidden: true, parentId: null },
      ],
      "/admin/content/help": {
        content: {
          topics: [
            {
              id: "t",
              title: "Buying",
              published: true,
              questions: [
                { id: "t-1", q: "How do offers work?", a: "…", published: true },
              ],
            },
          ],
        },
        history: [],
      },
    })
  )
  api.post.mockResolvedValue({})
  api.put.mockResolvedValue({})
}

beforeEach(() => vi.clearAllMocks())

describe("Landing page editor", () => {
  it("edits a section, hides another and saves the draft as a new version", async () => {
    const user = userEvent.setup()
    setup(landing())
    renderScreen(<LandingEditor />)
    expect(await screen.findByText("The built-in page (Phase 1)")).toBeInTheDocument()
    const headline = screen.getByLabelText("Headline")
    await user.clear(headline)
    await user.type(headline, "Spring deals are here")
    // Hide the newsletter section.
    const shown = screen.getAllByLabelText("Shown")
    await user.click(shown[8]!)
    await user.click(screen.getByRole("button", { name: "Save draft" }))
    await user.type(screen.getByLabelText("Reason"), "Spring launch copy")
    await user.click(screen.getByRole("button", { name: "Save" }))
    const body = api.put.mock.calls[0]![1] as {
      content: typeof DEFAULT_LANDING
      reason: string
    }
    expect(api.put.mock.calls[0]![0]).toBe("/admin/content/landing")
    expect(body.content.hero.title).toBe("Spring deals are here")
    expect(body.content.newsletter.visible).toBe(false)
  })

  it("opens each section's fields and lists only visible top-level categories and published questions", async () => {
    const user = userEvent.setup()
    setup(landing())
    renderScreen(<LandingEditor />)
    await user.click(await screen.findByRole("button", { name: "Shop by category" }))
    expect(screen.getByLabelText("Home & living")).toBeInTheDocument()
    expect(screen.queryByLabelText("Old")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Questions" }))
    expect(screen.getByLabelText("How do offers work?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "How it works" }))
    await user.click(screen.getAllByRole("button", { name: "Remove step 1" })[0]!)
    expect(screen.getAllByLabelText(/^Step \d$/)).toHaveLength(7)
    await user.click(screen.getByRole("button", { name: "Why Marketbase" }))
    await user.click(screen.getByRole("button", { name: "Remove point 1" }))
    await user.click(screen.getByRole("button", { name: "Add a point" }))
    for (const name of [
      "Featured listings",
      "Trust and safety",
      "For sellers",
      "Newsletter signup",
      "Final call to action",
    ])
      await user.click(screen.getByRole("button", { name }))
    // Only the last section opened stays open.
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      DEFAULT_LANDING.finalCta.title
    )
  })

  it("shows versions and decisions, and switches visitors to the published version", async () => {
    const user = userEvent.setup()
    setup(
      landing({
        live: { ...structuredClone(DEFAULT_LANDING), version: 2, publishedAt: at },
        status: "published",
      })
    )
    renderScreen(<LandingEditor />)
    expect(await screen.findByText("Published: version 2")).toBeInTheDocument()
    expect(screen.getByText(/Content saved version 2: Spring copy/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restore version 1" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Show my version to visitors" }))
    await user.type(screen.getByLabelText("Reason"), "Spring copy approved")
    await user.click(screen.getByRole("button", { name: "Switch" }))
    expect(api.post).toHaveBeenCalledWith("/admin/content/landing/source", {
      source: "admin",
      reason: "Spring copy approved",
    })
  })

  it("asks for approval when it's required, and lets another admin approve", async () => {
    const user = userEvent.setup()
    setup(
      landing({
        approvalRequired: true,
        status: "pending_approval",
        source: "admin",
        live: { ...structuredClone(DEFAULT_LANDING), version: 1, publishedAt: at },
      })
    )
    renderScreen(<LandingEditor />)
    expect(await screen.findByText(/Waiting for approval/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Go back to the built-in page" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Approve" }))
    await user.type(screen.getByLabelText("Reason"), "Checked the copy")
    await user.click(screen.getByRole("button", { name: "Approve" }))
    expect(api.post).toHaveBeenCalledWith("/admin/content/landing/approve", {
      reason: "Checked the copy",
    })
  })
})
