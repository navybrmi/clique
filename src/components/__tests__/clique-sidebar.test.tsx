import "@testing-library/jest-dom"
import React from "react"
import { render, screen } from "@testing-library/react"
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

describe("CliqueSidebar", () => {
  const cliques = [
    { id: "clique-1", name: "Weekend Crew" },
    { id: "clique-2", name: "Movie Night" },
  ]

  it('renders the "Public" link to the home feed', () => {
    render(<CliqueSidebar cliques={cliques} />)

    expect(screen.getByText("Select Feed")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Public" })).toHaveAttribute(
      "href",
      "/"
    )
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
  })

  it("marks the active clique link with aria-current", () => {
    render(<CliqueSidebar cliques={cliques} activeCliqueId="clique-2" />)

    const activeLink = screen.getByRole("link", { name: "Movie Night" })
    expect(activeLink).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(activeLink).toHaveClass("bg-zinc-900")
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
    expect(publicLink).toHaveClass("bg-zinc-900")
    expect(screen.queryByText("Current")).not.toBeInTheDocument()
  })

  it("renders the create clique trigger", () => {
    render(<CliqueSidebar cliques={cliques} />)

    expect(
      screen.getByRole("button", { name: "Create new Clique" })
    ).toBeInTheDocument()
  })
})
