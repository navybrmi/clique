import "@testing-library/jest-dom"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

/**
 * Renders an open sheet and returns the content element (portaled to body).
 */
function renderOpenSheet(side?: "left" | "bottom", className?: string) {
  render(
    <Sheet open>
      <SheetContent side={side} className={className}>
        <p>Sheet body</p>
      </SheetContent>
    </Sheet>
  )
  return document.querySelector('[data-slot="sheet-content"]') as HTMLElement
}

describe("Sheet", () => {
  it("slides in from the left by default", () => {
    const content = renderOpenSheet()
    expect(content).toHaveClass("left-0", "top-0", "h-full", "w-72")
    expect(content.className).toContain("slide-in-from-left")
    expect(content.className).not.toContain("slide-in-from-bottom")
  })

  it("slides in from the bottom when side is 'bottom'", () => {
    const content = renderOpenSheet("bottom")
    expect(content).toHaveClass("inset-x-0", "bottom-0", "w-full", "rounded-t-xl")
    expect(content.className).toContain("slide-in-from-bottom")
    expect(content.className).not.toContain("slide-in-from-left")
  })

  it("merges a custom className onto the content", () => {
    const content = renderOpenSheet("bottom", "max-h-[80vh]")
    expect(content).toHaveClass("max-h-[80vh]")
  })

  it("uses 'Navigation menu' as the default sr-only dialog title", () => {
    renderOpenSheet()
    expect(screen.getByText("Navigation menu")).toHaveClass("sr-only")
  })

  it("renders a custom sr-only dialog title when title is provided", () => {
    render(
      <Sheet open>
        <SheetContent side="bottom" title="Choose a feed">
          <p>Sheet body</p>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText("Choose a feed")).toHaveClass("sr-only")
    expect(screen.queryByText("Navigation menu")).not.toBeInTheDocument()
  })

  it("renders children and a close button", () => {
    renderOpenSheet()
    expect(screen.getByText("Sheet body")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument()
  })

  it("opens via the trigger", () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">Open sheet</button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <p>Sheet body</p>
        </SheetContent>
      </Sheet>
    )
    expect(screen.queryByText("Sheet body")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /open sheet/i }))
    expect(screen.getByText("Sheet body")).toBeInTheDocument()
  })
})
