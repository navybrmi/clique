import React from "react"
import { render, screen } from "@testing-library/react"
import { LikeCounts } from "@/components/like-counts"

describe("LikeCounts", () => {
  it("always shows the total with an accessible label", () => {
    render(<LikeCounts total={12} secondary={3} />)
    expect(screen.getByLabelText("12 likes across all cliques")).toBeInTheDocument()
  })

  it("shows 'N likes across your cliques' when secondary is a positive integer", () => {
    render(<LikeCounts total={12} secondary={3} />)
    expect(screen.getByLabelText("3 likes across your cliques")).toBeInTheDocument()
    expect(screen.getByText("3 likes across your cliques")).toBeInTheDocument()
  })

  it("omits the secondary label when null (logged out)", () => {
    render(<LikeCounts total={12} secondary={null} />)
    expect(screen.getByLabelText("12 likes across all cliques")).toBeInTheDocument()
    expect(screen.queryByText(/likes across your cliques/i)).not.toBeInTheDocument()
  })

  it("omits the secondary label when secondary is 0", () => {
    render(<LikeCounts total={12} secondary={0} />)
    expect(screen.queryByText(/likes across your cliques/i)).not.toBeInTheDocument()
  })

  it("secondary === 0 and secondary === null produce identical output (no secondary span)", () => {
    const { container: withZero } = render(<LikeCounts total={5} secondary={0} />)
    const { container: withNull } = render(<LikeCounts total={5} secondary={null} />)
    expect(withZero.innerHTML).toBe(withNull.innerHTML)
  })

  it("still renders the global total when secondary is 0", () => {
    render(<LikeCounts total={5} secondary={0} />)
    expect(screen.getByLabelText("5 likes across all cliques")).toBeInTheDocument()
  })

  it("renders correctly when total is 0 and secondary is 0", () => {
    render(<LikeCounts total={0} secondary={0} />)
    expect(screen.getByLabelText("0 likes across all cliques")).toBeInTheDocument()
    expect(screen.queryByText(/likes across your cliques/i)).not.toBeInTheDocument()
  })

  it("renders correctly when total is 0 and secondary is positive", () => {
    render(<LikeCounts total={0} secondary={3} />)
    expect(screen.getByLabelText("0 likes across all cliques")).toBeInTheDocument()
    expect(screen.getByText("3 likes across your cliques")).toBeInTheDocument()
  })
})
