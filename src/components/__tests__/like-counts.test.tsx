import React from "react"
import { render, screen } from "@testing-library/react"
import { LikeCounts } from "@/components/like-counts"

describe("LikeCounts", () => {
  it("always shows the total with an accessible label", () => {
    render(<LikeCounts total={12} secondary={3} />)
    expect(
      screen.getByLabelText("12 likes across all cliques")
    ).toBeInTheDocument()
  })

  it("shows the secondary 'in your cliques' figure when provided", () => {
    render(<LikeCounts total={12} secondary={3} />)
    expect(screen.getByLabelText("3 likes from your cliques")).toBeInTheDocument()
    expect(screen.getByText(/3 in your cliques/i)).toBeInTheDocument()
  })

  it("omits the secondary figure when null (logged out)", () => {
    render(<LikeCounts total={12} secondary={null} />)
    expect(screen.getByLabelText("12 likes across all cliques")).toBeInTheDocument()
    expect(screen.queryByText(/in your cliques/i)).not.toBeInTheDocument()
  })

  it("renders a zero total rather than blank", () => {
    render(<LikeCounts total={0} secondary={0} />)
    expect(screen.getByLabelText("0 likes across all cliques")).toBeInTheDocument()
    expect(screen.getByText(/0 in your cliques/i)).toBeInTheDocument()
  })
})
