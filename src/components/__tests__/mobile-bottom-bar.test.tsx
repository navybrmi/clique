import "@testing-library/jest-dom"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { MobileBottomBar } from "@/components/mobile-bottom-bar"

const cliques = [
  { id: "clique-1", name: "Weekend Crew" },
  { id: "clique-2", name: "Foodies" },
]

jest.mock("@/components/clique-sidebar", () => ({
  CliqueSidebar: ({
    cliques,
    activeCliqueId,
    activeMine,
    userId,
    currentCliqueId,
    onNavigate,
  }: {
    cliques: { id: string; name: string }[]
    activeCliqueId?: string
    activeMine?: boolean
    userId?: string | null
    currentCliqueId?: string
    onNavigate?: () => void
  }) => (
    <div
      data-testid="clique-sidebar"
      data-clique-ids={cliques.map((c) => c.id).join(",")}
      data-active-clique-id={activeCliqueId ?? ""}
      data-active-mine={String(activeMine ?? false)}
      data-user-id={userId ?? ""}
      data-current-clique-id={currentCliqueId ?? ""}
    >
      <button onClick={onNavigate} data-testid="nav-link">
        Select Feed
      </button>
    </div>
  ),
}))

jest.mock("@/components/add-recommendation-trigger", () => ({
  AddRecommendationTrigger: ({
    userId,
    currentCliqueId,
    layout,
  }: {
    userId?: string | null
    currentCliqueId?: string
    layout?: string
  }) => (
    <div
      data-testid="add-recommendation-trigger"
      data-user-id={userId ?? ""}
      data-current-clique-id={currentCliqueId ?? ""}
      data-layout={layout ?? ""}
    />
  ),
}))

jest.mock("@/components/ui/sheet", () => {
  const React = jest.requireActual<typeof import("react")>("react")

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
            ? React.cloneElement(
                child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>,
                { onOpenChange }
              )
            : child
        )}
      </div>
    )
  }

  function SheetTrigger({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode
    asChild?: boolean
    onOpenChange?: (open: boolean) => void
  }) {
    const child = React.Children.only(children) as React.ReactElement<{
      onClick?: () => void
    }>
    return React.cloneElement(child, {
      onClick: () => onOpenChange?.(true),
    })
  }

  function SheetContent({
    children,
    side,
    title,
  }: {
    children: React.ReactNode
    side?: string
    title?: string
  }) {
    return (
      <div data-testid="sheet-content" data-side={side ?? ""} data-title={title ?? ""}>
        {children}
      </div>
    )
  }

  return { Sheet, SheetTrigger, SheetContent }
})

describe("MobileBottomBar", () => {
  it("renders the Cliques button for authenticated users", () => {
    render(<MobileBottomBar userId="user-1" cliques={cliques} />)
    expect(screen.getByRole("button", { name: /cliques/i })).toBeInTheDocument()
  })

  it("does not render the Cliques button for unauthenticated users", () => {
    render(<MobileBottomBar userId={null} cliques={[]} />)
    expect(screen.queryByRole("button", { name: /cliques/i })).not.toBeInTheDocument()
  })

  it("always renders the Add trigger with the mobile-bar layout", () => {
    render(<MobileBottomBar userId={null} cliques={[]} />)
    const trigger = screen.getByTestId("add-recommendation-trigger")
    expect(trigger).toHaveAttribute("data-layout", "mobile-bar")
    expect(trigger).toHaveAttribute("data-user-id", "")
  })

  it("forwards userId and currentCliqueId to the Add trigger", () => {
    render(
      <MobileBottomBar userId="user-1" cliques={cliques} currentCliqueId="clique-2" />
    )
    const trigger = screen.getByTestId("add-recommendation-trigger")
    expect(trigger).toHaveAttribute("data-user-id", "user-1")
    expect(trigger).toHaveAttribute("data-current-clique-id", "clique-2")
  })

  it("opens the Cliques sheet from the bottom when the trigger is clicked", () => {
    render(<MobileBottomBar userId="user-1" cliques={cliques} />)
    fireEvent.click(screen.getByRole("button", { name: /cliques/i }))
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "true")
    expect(screen.getByTestId("sheet-content")).toHaveAttribute("data-side", "bottom")
  })

  it("labels the feed switcher sheet 'Choose a feed' for assistive tech", () => {
    render(<MobileBottomBar userId="user-1" cliques={cliques} />)
    expect(screen.getByTestId("sheet-content")).toHaveAttribute(
      "data-title",
      "Choose a feed"
    )
  })

  it("closes the sheet when a feed nav link is clicked", () => {
    render(<MobileBottomBar userId="user-1" cliques={cliques} />)
    fireEvent.click(screen.getByRole("button", { name: /cliques/i }))
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "true")
    fireEvent.click(screen.getByTestId("nav-link"))
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-open", "false")
  })

  it("forwards feed context props to CliqueSidebar", () => {
    render(
      <MobileBottomBar
        userId="user-1"
        cliques={cliques}
        activeCliqueId="clique-1"
        activeMine={false}
        currentCliqueId="clique-1"
      />
    )
    const sidebar = screen.getByTestId("clique-sidebar")
    expect(sidebar).toHaveAttribute("data-clique-ids", "clique-1,clique-2")
    expect(sidebar).toHaveAttribute("data-active-clique-id", "clique-1")
    expect(sidebar).toHaveAttribute("data-active-mine", "false")
    expect(sidebar).toHaveAttribute("data-user-id", "user-1")
    expect(sidebar).toHaveAttribute("data-current-clique-id", "clique-1")
  })

  it("forwards activeMine to CliqueSidebar when the My Recommendations feed is active", () => {
    render(<MobileBottomBar userId="user-1" cliques={cliques} activeMine />)
    expect(screen.getByTestId("clique-sidebar")).toHaveAttribute(
      "data-active-mine",
      "true"
    )
  })

  it("is hidden on desktop viewports via lg:hidden", () => {
    const { container } = render(<MobileBottomBar userId="user-1" cliques={cliques} />)
    expect(container.firstChild).toHaveClass("lg:hidden", "fixed", "bottom-0")
  })
})
