import "@testing-library/jest-dom"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { HomeFeedItem } from "@/types/feed"

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

jest.mock("@/components/upvote-button", () => ({
  UpvoteButton: ({ recommendationId }: { recommendationId: string }) => (
    <button data-testid={`upvote-${recommendationId}`}>Upvote</button>
  ),
}))

jest.mock("@/components/add-to-cliques-dialog", () => ({
  AddToCliquesDialog: ({ recommendationId }: { recommendationId: string }) => (
    <button data-testid={`add-to-clique-${recommendationId}`}>Add to Clique</button>
  ),
}))

import { RecommendationFeed } from "../recommendation-feed"

const makeRec = (
  id: string,
  category: string,
  overrides: Partial<HomeFeedItem> = {}
): HomeFeedItem => ({
  id,
  tags: [],
  rating: 7,
  imageUrl: null,
  link: null,
  entity: {
    name: `${category} ${id}`,
    category: { displayName: category },
    restaurant:
      category === "Restaurant"
        ? { cuisine: "Italian", location: "NYC", priceRange: "$$" }
        : null,
    movie:
      category === "Movie"
        ? { director: "Nolan", year: 2023, genre: "Action", duration: "2h" }
        : null,
    fashion: null,
    household: null,
    other: null,
  },
  _count: { upvotes: 3, comments: 1 },
  attribution: null,
  href: `/recommendations/${id}`,
  ...overrides,
})

describe("RecommendationFeed", () => {
  it("renders the CategoryFilter bar with label", () => {
    render(
      <RecommendationFeed
        recommendations={[]}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    expect(screen.getByText("Filter Category:")).toBeInTheDocument()
  })

  it("shows all recommendations by default (both filter options selected)", () => {
    const recs = [
      makeRec("1", "Movie"),
      makeRec("2", "Restaurant"),
      makeRec("3", "Fashion"),
    ]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    // Entity name appears in both image placeholder and CardTitle
    expect(screen.getAllByText("Movie 1").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Restaurant 2").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Fashion 3").length).toBeGreaterThan(0)
  })

  it("filters to only Movie recommendations when Restaurants is deselected", async () => {
    const user = userEvent.setup()
    const recs = [makeRec("1", "Movie"), makeRec("2", "Restaurant")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    await user.click(screen.getByRole("button", { name: /all/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /restaurants/i }))
    expect(screen.getAllByText("Movie 1").length).toBeGreaterThan(0)
    expect(screen.queryAllByText("Restaurant 2")).toHaveLength(0)
  })

  it("filters to only Restaurant recommendations when Movies is deselected", async () => {
    const user = userEvent.setup()
    const recs = [makeRec("1", "Movie"), makeRec("2", "Restaurant")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    await user.click(screen.getByRole("button", { name: /all/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /movies/i }))
    expect(screen.queryAllByText("Movie 1")).toHaveLength(0)
    expect(screen.getAllByText("Restaurant 2").length).toBeGreaterThan(0)
  })

  it("shows all recommendations when all filters are deselected", async () => {
    const user = userEvent.setup()
    const recs = [makeRec("1", "Movie"), makeRec("2", "Restaurant"), makeRec("3", "Fashion")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    // Open dropdown and deselect both — dropdown stays open between selections
    await user.click(screen.getByRole("button", { name: /all/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /movies/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /restaurants/i }))
    expect(screen.getAllByText("Movie 1").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Restaurant 2").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Fashion 3").length).toBeGreaterThan(0)
  })

  it("includes Fashion/Household/Other items when both filters are selected (no filter applied)", () => {
    const recs = [
      makeRec("1", "Movie"),
      makeRec("2", "Restaurant"),
      makeRec("3", "Fashion"),
      makeRec("4", "Household"),
    ]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    expect(screen.getAllByText("Fashion 3").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Household 4").length).toBeGreaterThan(0)
  })

  it("shows feed-empty state when recommendations list is empty", () => {
    render(
      <RecommendationFeed
        recommendations={[]}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    expect(
      screen.getByText(/no recommendations yet\. be the first to add one!/i)
    ).toBeInTheDocument()
  })

  it("shows 'You haven't added any recommendations' when activeMine and empty", () => {
    render(
      <RecommendationFeed
        recommendations={[]}
        showAddToCliqueActions={false}
        activeMine={true}
      />
    )
    expect(
      screen.getByText(/you haven't added any recommendations yet/i)
    ).toBeInTheDocument()
  })

  it("shows filter-empty state when filter matches nothing but feed has items", async () => {
    const user = userEvent.setup()
    const recs = [makeRec("1", "Fashion")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    // Deselect Restaurants so only Movies filter is active
    await user.click(screen.getByRole("button", { name: /all/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /restaurants/i }))
    expect(
      screen.getByText(/no recommendations of this type yet/i)
    ).toBeInTheDocument()
  })

  it("shows UpvoteButton when upvoteContext is present", () => {
    const recs = [
      makeRec("1", "Movie", {
        upvoteContext: { cliqueId: "clique1", hasUpvoted: false },
      }),
    ]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    expect(screen.getByTestId("upvote-1")).toBeInTheDocument()
  })

  it("does not show UpvoteButton when upvoteContext is absent", () => {
    const recs = [makeRec("1", "Movie")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    expect(screen.queryByTestId("upvote-1")).not.toBeInTheDocument()
  })

  it("shows AddToCliquesDialog when showAddToCliqueActions is true", () => {
    const recs = [makeRec("1", "Movie")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={true}
        activeMine={false}
      />
    )
    expect(screen.getByTestId("add-to-clique-1")).toBeInTheDocument()
  })

  it("does not show AddToCliquesDialog when showAddToCliqueActions is false", () => {
    const recs = [makeRec("1", "Movie")]
    render(
      <RecommendationFeed
        recommendations={recs}
        showAddToCliqueActions={false}
        activeMine={false}
      />
    )
    expect(screen.queryByTestId("add-to-clique-1")).not.toBeInTheDocument()
  })
})
