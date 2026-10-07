import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ModuleAccessContext } from "@/components/module-access"
import { ReasonDialog } from "@/components/reason-dialog"

vi.mock("@/lib/api", () => ({
  getErrorMessage: (_: unknown, fallback: string) => fallback,
}))

const NOTE = "Third report this month; checked the messages first."

describe("ReasonDialog", () => {
  it("asks big actions for an internal note and passes it on", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ReasonDialog
        trigger="Suspend account"
        title="Suspend Asha?"
        description="They're logged out."
        confirmLabel="Suspend"
        noteRequired
        onConfirm={onConfirm}
      />
    )
    await user.click(screen.getByRole("button", { name: "Suspend account" }))
    await user.type(screen.getByLabelText("Reason"), "Abusive messages")
    await user.click(screen.getByRole("button", { name: "Suspend" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/internal note/)
    expect(onConfirm).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText("Internal note"), NOTE)
    await user.click(screen.getByRole("button", { name: "Suspend" }))
    expect(onConfirm).toHaveBeenCalledWith("Abusive messages", NOTE)
  })

  it("has no note field for ordinary actions", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ReasonDialog
        trigger="Restore account"
        title="Restore Asha?"
        description="They can log in again."
        confirmLabel="Restore"
        onConfirm={onConfirm}
      />
    )
    await user.click(screen.getByRole("button", { name: "Restore account" }))
    expect(screen.queryByLabelText("Internal note")).toBeNull()
    await user.type(screen.getByLabelText("Reason"), "Apologised")
    await user.click(screen.getByRole("button", { name: "Restore" }))
    expect(onConfirm).toHaveBeenCalledWith("Apologised", undefined)
  })

  it("isn't there at all on a view-only section", () => {
    render(
      <ModuleAccessContext.Provider value="view">
        <ReasonDialog
          trigger="Suspend account"
          title="Suspend?"
          description="…"
          confirmLabel="Suspend"
          onConfirm={vi.fn()}
        />
      </ModuleAccessContext.Provider>
    )
    expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull()
  })
})
