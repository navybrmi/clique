import "@testing-library/jest-dom"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { MobileSidebarSheet } from "@/components/mobile-sidebar-sheet"

const cliques = [
  { id: "clique-1", name: "Weekend Crew" },
  { id: "clique-2", name: "Foodies" },
]

jest.mock("@/components/clique-sidebar", () => ({
  CliqueSidebar: ({
    onNavigate,
  }: {
    onNavigate?: () => void
  }) => (
    <div data-testid="clique-sidebar">
      <button onClick={onNavigate} data-testid="nav-link">
        Select Feed
      </button>
    </div>
  ),
}))

jest.mock("@/components/ui/sheet", () => {
  const React = require("react")

  function Sheet({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) {
    return (
      <div data-testid="sheet" data-open={open}>
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>, { onOpenChange })
            : child
        )}
      </div>
    )
  }

  function SheetTrigger({
    children,
    asChild,
    onOpenChange,
  }: {
    children: React.ReactNode
    asChild?: boolean
    onOpenChange?: (open: boolean) => void
  }) {
    const child = React.Children.only(children) as React.ReactElement
    return React.cloneElement(child, {
      onClick: () => onOpenChange?.(true),
    })
  }

  function SheetContent({
    children,
  }: {
    children: React.ReactNode
  }) {
    return <div data-testid="sheet-content">{children}</div>
  }

  return { Sheet, SheetTrigger, SheetContent }
})

describe("MobileSidebarSheet", () => {
  it("sets aria-label to 'Public' by default", () => {
    render(<MobileSidebarSheet cliques={cliques} />)
    expect(screen.getByRole("button", { name: /current feed: Public/i })).toBeInTheDocument()
  })

  it("sets aria-label to the active clique name when activeCliqueId is set", () => {
    render(
      <MobileSidebarSheet cliques={cliques} activeCliqueId="clique-2" />
    )
    expect(screen.getByRole("button", { name: /current feed: Foodies/i })).toBeInTheDocument()
  })

  it("sets aria-label to 'My Recommendations' when activeMine is true", () => {
    render(<MobileSidebarSheet cliques={cliques} activeMine />)
    expect(screen.getByRole("button", { name: /current feed: My Recommendations/i })).toBeInTheDocument()
  })

  it("sets aria-label to 'Feeds' when activeCliqueId does not match any clique", () => {
    render(
      <MobileSidebarSheet cliques={cliques} activeCliqueId="unknown-id" />
    )
    expect(screen.getByRole("button", { name: /current feed: Feeds/i })).toBeInTheDocument()
  })

  it("opens the sheet when the trigger button is clicked", () => {
    render(<MobileSidebarSheet cliques={cliques} />)
    const trigger = screen.getByRole("button", { name: /open navigation menu/i })
    fireEvent.click(trigger)
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "true")
  })

  it("closes the sheet when a feed nav link is clicked", () => {
    render(<MobileSidebarSheet cliques={cliques} />)
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }))
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "true")
    fireEvent.click(screen.getByTestId("nav-link"))
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "false")
  })
})
