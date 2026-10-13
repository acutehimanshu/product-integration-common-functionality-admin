import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getByPath, renderScreen } from "@/test-render"
import { RatingHubSync } from "@/modules/reviews/ratinghub-sync"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
const downloadCsv = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api", () => ({
  api,
  downloadCsv,
  getErrorMessage: (_: unknown, fallback: string) => fallback,
}))

const at = "2026-10-12T00:00:00.000Z"
const entry = (over: object) => ({
  id: "rh-1",
  reviewId: "rv-1",
  sellerId: "s-1",
  action: "publish",
  version: 1,
  status: "sent",
  attempts: 1,
  nextAttemptAt: at,
  createdAt: at,
  ...over,
})

beforeEach(() => {
  api.post.mockResolvedValue({ status: "ready" })
  downloadCsv.mockResolvedValue(undefined)
})

describe("RatingHub sync panel", () => {
  it("says when the sync is off", async () => {
    api.get.mockImplementation(
      getByPath({
        "/admin/ratinghub": {
          enabled: false,
          adapter: "Test RatingHub",
          counts: { pending: 0, sent: 0, failed: 0, superseded: 0 },
          entries: [],
        },
      })
    )
    renderScreen(<RatingHubSync />)
    expect(
      await screen.findByText(/Off — turn it on in Settings › Reviews/)
    ).toBeInTheDocument()
  })

  it("shows entries and retries a failed one", async () => {
    const user = userEvent.setup()
    api.get.mockImplementation(
      getByPath({
        "/admin/ratinghub": {
          enabled: true,
          adapter: "Test RatingHub",
          counts: { pending: 0, sent: 1, failed: 1, superseded: 0 },
          entries: [
            entry({ externalRef: "rh_rv-1", lastAttemptAt: at }),
            entry({
              id: "rh-2",
              reviewId: "rv-2",
              action: "withdraw",
              status: "failed",
              attempts: 5,
              lastError: "RatingHub is unavailable (503)",
            }),
          ],
        },
      })
    )
    renderScreen(<RatingHubSync />)
    expect(
      await screen.findByText(/On — published reviews go to Test RatingHub/)
    ).toBeInTheDocument()
    expect(screen.getByText(/RatingHub rh_rv-1/)).toBeInTheDocument()
    expect(screen.getByText(/Take back review rv-2/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Retry review rv-2" }))
    await user.type(screen.getByLabelText("Reason"), "RatingHub is back up")
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(api.post).toHaveBeenCalledWith("/admin/ratinghub/rh-2/retry", {
      reason: "RatingHub is back up",
    })
  })
})
