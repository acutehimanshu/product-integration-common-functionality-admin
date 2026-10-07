import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChangeList } from "./change-list"

describe("ChangeList", () => {
  it("shows each field with its value before and after", () => {
    render(
      <ChangeList
        changes={[
          { field: "Limits › Max offer rounds", before: "3", after: "4" },
          { field: "Platform fee › Percent", before: null, after: "5" },
        ]}
      />
    )
    const row = screen.getByRole("row", { name: /Max offer rounds/ })
    expect(row).toHaveTextContent("34")
    expect(screen.getByRole("row", { name: /Percent/ })).toHaveTextContent("—5")
    expect(screen.getByText("2 changes")).toBeInTheDocument()
  })

  it("renders nothing without changes", () => {
    const { container } = render(<ChangeList changes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
