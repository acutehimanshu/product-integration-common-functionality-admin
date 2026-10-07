import { render, screen } from "@testing-library/react"
import { nth } from "@acutehimanshu/core/testing"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { OrderedIdList } from "./ordered-id-list"

const items = [
  { id: "a", name: "Alpha", enabled: true },
  { id: "b", name: "Beta", enabled: false },
  { id: "c", name: "Gamma", enabled: true },
]

function setup(props: Partial<Parameters<typeof OrderedIdList>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <OrderedIdList
      ids={["a", "b"]}
      items={items}
      addable={[nth(items, 2)]}
      context="Global Email"
      listLabel="Global Email order"
      addPlaceholder="Choose a provider…"
      selectId="add-global-email"
      onChange={onChange}
      {...props}
    />
  )
  return { onChange, user: userEvent.setup() }
}

describe("OrderedIdList", () => {
  it("lists the order and marks switched-off ones as skipped", () => {
    setup()
    const list = screen.getByRole("list", { name: "Global Email order" })
    expect(list).toHaveTextContent("1. Alpha")
    expect(list).toHaveTextContent("2. Beta (off — skipped)")
  })

  it("moves one up, removes one, and adds one", async () => {
    const { onChange, user } = setup()
    expect(
      screen.getByRole("button", { name: "Move Alpha up in Global Email" })
    ).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Move Beta up in Global Email" }))
    expect(onChange).toHaveBeenLastCalledWith(["b", "a"])
    await user.click(
      screen.getByRole("button", { name: "Remove Alpha from Global Email" })
    )
    expect(onChange).toHaveBeenLastCalledWith(["b"])
    await user.selectOptions(screen.getByLabelText("Add"), "c")
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"])
  })

  it("keeps the last one when asked to", () => {
    setup({ ids: ["a"], keepOne: true })
    expect(
      screen.getByRole("button", { name: "Remove Alpha from Global Email" })
    ).toBeDisabled()
  })

  it("shows the empty text instead of an empty list, and no add box when nothing is left", () => {
    setup({
      ids: [],
      addable: [],
      emptyText: "Nothing — messages are logged as not sent.",
    })
    expect(
      screen.getByText("Nothing — messages are logged as not sent.")
    ).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Add")).not.toBeInTheDocument()
  })
})
