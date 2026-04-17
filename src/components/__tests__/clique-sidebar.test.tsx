import "@testing-library/jest-dom"
import React from "react"
import { render, screen, within } from "@testing-library/react"
import { CliqueSidebar } from "@/components/clique-sidebar"

jest.mock("next/link", () => {
  function MockLink({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  MockLink.displayName = "MockLink"
  return MockLink
})

jest.mock("@/components/create-clique-dialog", () => ({
  CreateCliqueDialog: () => <button type="button">Create new Clique</button>,
}))

jest.mock("@/components/add-recommendation-trigger", () => ({
  AddRecommendationTrigger: ({
    userId,
    currentCliqueId,
    layout,
  }: {
    userId: string | null
    currentCliqueId?: string
    layout?: "hero" | "sidebar"
  }) => (
    <div
      data-testid="add-rec-trigger"
      data-userid={userId ?? ""}
      data-current-clique-id={currentCliqueId ?? ""}
      data-layout={layout ?? "hero"}
    >
      Add Recommendation
    </div>
  ),
}))

describe("CliqueSidebar", () => {
  const cliques = [
    { id: "clique-1", name: "Weekend Crew" },
    { id: "clique-2", name: "Movie Night" },
  ]

  it('renders the "Public" link to the home feed', () => {
    render(<CliqueSidebar cliques={cliques} />)

    expect(screen.getByText("Feeds")).toBeInTheDocument()
    expect(screen.getByText("Choose a feed")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Public" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByText("Public")).toHaveClass("font-serif", "italic")
  })

  it("renders a link for each clique", () => {
    render(<CliqueSidebar cliques={cliques} />)

    expect(screen.getByRole("link", { name: "Weekend Crew" })).toHaveAttribute(
      "href",
      "/?cliqueId=clique-1"
    )
    expect(screen.getByRole("link", { name: "Movie Night" })).toHaveAttribute(
      "href",
      "/?cliqueId=clique-2"
    )
    expect(screen.getByText("Weekend Crew")).toHaveClass("font-serif", "italic")
  })

  it("marks the active clique link with aria-current", () => {
    render(<CliqueSidebar cliques={cliques} activeCliqueId="clique-2" />)

    const activeLink = screen.getByRole("link", { name: "Movie Night" })
    expect(activeLink).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(activeLink).toHaveClass("bg-zinc-100", "border-zinc-300")
    expect(within(activeLink).getByTestId("active-feed-indicator")).toBeInTheDocument()
    expect(screen.queryByText("Current")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Public" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it('marks "Public" as active when no clique is selected', () => {
    render(<CliqueSidebar cliques={cliques} />)

    const publicLink = screen.getByRole("link", { name: "Public" })
    expect(publicLink).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(publicLink).toHaveClass("bg-zinc-100", "border-zinc-300")
    expect(within(publicLink).getByTestId("active-feed-indicator")).toBeInTheDocument()
    expect(screen.queryByText("Current")).not.toBeInTheDocument()
  })

  it("renders the create clique trigger", () => {
    render(<CliqueSidebar cliques={cliques} />)

    expect(
      screen.getByRole("button", { name: "Create new Clique" })
    ).toBeInTheDocument()
  })

  it("renders a compact quick-start section when user context is provided", () => {
    render(
      <CliqueSidebar
        cliques={cliques}
        userId="user-1"
        currentCliqueId="clique-1"
      />
    )

    expect(screen.getByText("Quick start")).toBeInTheDocument()
    expect(
      screen.getByText(/Share a recommendation or jump into the feeds/)
    ).toBeInTheDocument()
    expect(screen.getByTestId("add-rec-trigger")).toHaveAttribute(
      "data-userid",
      "user-1"
    )
    expect(screen.getByTestId("add-rec-trigger")).toHaveAttribute(
      "data-current-clique-id",
      "clique-1"
    )
    expect(screen.getByTestId("add-rec-trigger")).toHaveAttribute(
      "data-layout",
      "sidebar"
    )
  })

  it("does not render the quick-start section without user context", () => {
    render(<CliqueSidebar cliques={cliques} />)

    expect(screen.queryByText("Quick start")).not.toBeInTheDocument()
    expect(screen.queryByTestId("add-rec-trigger")).not.toBeInTheDocument()
  })

  it("does not render the quick-start section when userId is null", () => {
    render(<CliqueSidebar cliques={cliques} userId={null} />)

    expect(screen.queryByText("Quick start")).not.toBeInTheDocument()
    expect(screen.queryByTestId("add-rec-trigger")).not.toBeInTheDocument()
  })
})
