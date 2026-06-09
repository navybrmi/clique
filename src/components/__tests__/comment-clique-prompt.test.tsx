import React from "react"
import { render, screen } from "@testing-library/react"
import { CommentCliquePrompt } from "@/components/comment-clique-prompt"

describe("CommentCliquePrompt", () => {
  it("renders a link per clique that contains the reco", () => {
    render(
      <CommentCliquePrompt
        recommendationId="rec1"
        userCliques={[
          { id: "clq1", name: "Movie Buffs" },
          { id: "clq2", name: "Foodies" },
        ]}
      />
    )

    const first = screen.getByRole("link", { name: /Movie Buffs/i })
    const second = screen.getByRole("link", { name: /Foodies/i })
    expect(first).toHaveAttribute("href", "/recommendations/rec1?cliqueId=clq1")
    expect(second).toHaveAttribute("href", "/recommendations/rec1?cliqueId=clq2")
    expect(
      screen.getByText(/Open this recommendation in one of your cliques/i)
    ).toBeInTheDocument()
  })

  it("prompts to add the reco to a clique when the user has none", () => {
    render(<CommentCliquePrompt recommendationId="rec1" userCliques={[]} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(
      screen.getByText(/Add this recommendation to one of your cliques/i)
    ).toBeInTheDocument()
  })
})
