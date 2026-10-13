import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { noPermissions, presetPermissions } from "@acutehimanshu/core/domain/admin"
import { LoginForm } from "@/components/login-form"
import {
  confirmTwoStep,
  logInWithCode,
  logInWithPassword,
  requestLoginCode,
} from "@/lib/auth"

vi.mock("@/lib/auth", () => ({
  logInWithPassword: vi.fn(),
  requestLoginCode: vi.fn(),
  logInWithCode: vi.fn(),
  confirmTwoStep: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const admin = {
  id: "a-1",
  name: "Sam Super",
  email: "sam@marketbase.test",
  isSuperAdmin: false,
  permissions: noPermissions(),
}

describe("admin LoginForm", () => {
  beforeEach(() => vi.clearAllMocks())

  it("logs in with email and password", async () => {
    vi.mocked(logInWithPassword).mockResolvedValue({
      admin: { ...admin, isSuperAdmin: true },
    })
    const onLoggedIn = vi.fn()
    const user = userEvent.setup()
    render(<LoginForm onLoggedIn={onLoggedIn} />)

    await user.type(screen.getByLabelText("Email"), "sam@marketbase.test")
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "secret")
    await user.click(screen.getByRole("button", { name: "Log in" }))

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled())
    expect(logInWithPassword).toHaveBeenCalledWith("sam@marketbase.test", "secret")
  })

  it("asks for the emailed code when two-step login applies (FRD-01 ADM-003)", async () => {
    vi.mocked(logInWithPassword).mockResolvedValue({
      twoStep: {
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        resendAfter: new Date(Date.now() + 30_000).toISOString(),
        debugCode: "246810",
      },
    })
    vi.mocked(confirmTwoStep).mockResolvedValue(admin)
    const onLoggedIn = vi.fn()
    const user = userEvent.setup()
    render(<LoginForm onLoggedIn={onLoggedIn} />)

    await user.type(screen.getByLabelText("Email"), "sam@marketbase.test")
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "secret")
    await user.click(screen.getByRole("button", { name: "Log in" }))

    expect(await screen.findByText(/Two-step login/)).toBeInTheDocument()
    expect(onLoggedIn).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText("Code"), "246810")
    await user.click(screen.getByRole("button", { name: "Log in" }))
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(admin))
    expect(confirmTwoStep).toHaveBeenCalledWith("sam@marketbase.test", "246810")
  })

  it("shows the backend's refusal", async () => {
    vi.mocked(logInWithPassword).mockRejectedValue(
      new Error("That email and password don't match.")
    )
    const user = userEvent.setup()
    render(<LoginForm onLoggedIn={vi.fn()} />)

    await user.type(screen.getByLabelText("Email"), "sam@marketbase.test")
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "wrong")
    await user.click(screen.getByRole("button", { name: "Log in" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password don't match."
    )
  })

  it("logs in with a one-time code from its tab, keeping the email", async () => {
    vi.mocked(requestLoginCode).mockResolvedValue({
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      resendAfter: new Date(Date.now() + 30_000).toISOString(),
    })
    vi.mocked(logInWithCode).mockResolvedValue({
      ...admin,
      permissions: presetPermissions("finance"),
    })
    const onLoggedIn = vi.fn()
    const user = userEvent.setup()
    render(<LoginForm onLoggedIn={onLoggedIn} />)

    await user.type(screen.getByLabelText("Email"), "sam@marketbase.test")
    await user.click(screen.getByRole("tab", { name: "One-time code" }))
    expect(screen.getByLabelText("Email")).toHaveValue("sam@marketbase.test")
    expect(
      screen.queryByLabelText("Password", { selector: "input" })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Email me a code" }))
    await user.type(await screen.findByLabelText("Code"), "123456")
    await user.click(screen.getByRole("button", { name: "Log in" }))

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled())
    expect(logInWithCode).toHaveBeenCalledWith("sam@marketbase.test", "123456")
  })
})
