import React from "react"
import { render, screen } from "@testing-library/react"
import { InYourCliquesCard } from "@/components/in-your-cliques-card"

jest.mock("@/components/add-to-cliques-dialog", () => ({
  AddToCliquesDialog: ({ recommendationId }: { recommendationId: string }) => (
    <button data-testid={`add-to-cliques-${recommendationId}`}>Add to Cliques</button>
  ),
}))

describe("InYourCliquesCard", () => {
  it("renders a link per clique linking to its feed", () => {
    render(
      <InYourCliquesCard
        recommendationId="rec1"
        recommendationName="Inception"
        cliques={[
          { id: "clq1", name: "Movie Buffs" },
          { id: "clq2", name: "Cinephiles" },
        ]}
        currentUserId="user1"
      />
    )

    expect(screen.getByRole("link", { name: /Movie Buffs/i })).toHaveAttribute(
      "href",
      "/?cliqueId=clq1"
    )
    expect(screen.getByRole("link", { name: /Cinephiles/i })).toHaveAttribute(
      "href",
      "/?cliqueId=clq2"
    )
  })

  it("shows empty-state copy when there are no cliques", () => {
    render(
      <InYourCliquesCard
        recommendationId="rec1"
        recommendationName="Inception"
        cliques={[]}
        currentUserId="user1"
      />
    )

    expect(screen.queryByRole("link", { name: /clique/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/Add this recommendation to one of your cliques/i)
    ).toBeInTheDocument()
  })

  it("shows the add-to-cliques dialog in the empty state for logged-in users", () => {
    render(
      <InYourCliquesCard
        recommendationId="rec1"
        recommendationName="Inception"
        cliques={[]}
        currentUserId="user1"
      />
    )

    expect(screen.getByTestId("add-to-cliques-rec1")).toBeInTheDocument()
  })

  it("hides the add-to-cliques dialog when not logged in", () => {
    render(
      <InYourCliquesCard
        recommendationId="rec1"
        recommendationName="Inception"
        cliques={[]}
        currentUserId={null}
      />
    )

    expect(screen.queryByTestId("add-to-cliques-rec1")).not.toBeInTheDocument()
  })
})
