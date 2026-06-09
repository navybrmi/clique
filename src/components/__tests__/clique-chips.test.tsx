import React from "react"
import { render, screen } from "@testing-library/react"
import { CliqueChips } from "@/components/clique-chips"

describe("CliqueChips", () => {
  it("renders a chip per clique linking to its feed", () => {
    render(
      <CliqueChips
        chips={[
          { id: "clq1", name: "Movie Buffs" },
          { id: "clq2", name: "Foodies" },
        ]}
      />
    )

    const first = screen.getByRole("link", { name: /Movie Buffs/i })
    const second = screen.getByRole("link", { name: /Foodies/i })
    expect(first).toHaveAttribute("href", "/?cliqueId=clq1")
    expect(second).toHaveAttribute("href", "/?cliqueId=clq2")
  })

  it("renders nothing when there are no chips", () => {
    const { container } = render(<CliqueChips chips={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
