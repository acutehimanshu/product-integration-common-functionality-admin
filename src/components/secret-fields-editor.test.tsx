import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SecretFieldsEditor } from "./secret-fields-editor"

const fields = [
  { key: "from", label: "From address", placeholder: "hello@marketbase.com" },
  { key: "apiKey", label: "API key", secret: true },
]

describe("SecretFieldsEditor", () => {
  it("hides keys, shows only their last 4, and keeps settings and keys apart", async () => {
    const onSettings = vi.fn()
    const onSecrets = vi.fn()
    render(
      <SecretFieldsEditor
        fields={fields}
        idPrefix="provider-p1"
        settings={{ from: "" }}
        secrets={{}}
        kept={{ apiKey: "9f2c" }}
        onSettings={onSettings}
        onSecrets={onSecrets}
      />
    )
    const key = screen.getByLabelText("API key")
    expect(key).toHaveAttribute("type", "password")
    expect(key).toHaveAttribute("placeholder", "Set — ends in 9f2c. Type to replace.")
    expect(screen.getByLabelText("From address")).toHaveAttribute(
      "placeholder",
      "hello@marketbase.com"
    )

    const user = userEvent.setup()
    await user.type(key, "k")
    expect(onSecrets).toHaveBeenLastCalledWith({ apiKey: "k" })
    await user.type(screen.getByLabelText("From address"), "a")
    expect(onSettings).toHaveBeenLastCalledWith({ from: "a" })
  })
})
