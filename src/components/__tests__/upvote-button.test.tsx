import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { UpvoteButton } from "@/components/upvote-button"

global.fetch = jest.fn()

const defaultProps = {
  recommendationId: "rec1",
  cliqueId: "clique1",
  initialCount: 5,
  initialHasUpvoted: false,
}

describe("UpvoteButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the initial count", () => {
    render(<UpvoteButton {...defaultProps} />)
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByLabelText("Upvote")).toBeInTheDocument()
  })

  it("shows 'Remove upvote' label when already upvoted", () => {
    render(<UpvoteButton {...defaultProps} initialHasUpvoted={true} />)
    expect(screen.getByLabelText("Remove upvote")).toBeInTheDocument()
  })

  it("calls POST with cliqueId when clicking to upvote", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ upvotes: 6 }),
    })

    render(<UpvoteButton {...defaultProps} />)
    fireEvent.click(screen.getByLabelText("Upvote"))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/recommendations/rec1/upvotes?cliqueId=clique1",
        { method: "POST" }
      )
    })
    await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument())
    expect(screen.getByLabelText("Remove upvote")).toBeInTheDocument()
  })

  it("calls DELETE when clicking to remove upvote", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ upvotes: 4 }),
    })

    render(<UpvoteButton {...defaultProps} initialHasUpvoted={true} />)
    fireEvent.click(screen.getByLabelText("Remove upvote"))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/recommendations/rec1/upvotes",
        { method: "DELETE" }
      )
    })
    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument())
    expect(screen.getByLabelText("Upvote")).toBeInTheDocument()
  })

  it("does not update state when fetch fails", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })

    render(<UpvoteButton {...defaultProps} />)
    fireEvent.click(screen.getByLabelText("Upvote"))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByLabelText("Upvote")).toBeInTheDocument()
  })

  it("stops propagation to prevent link navigation", () => {
    const parentHandler = jest.fn()
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={parentHandler}>
        <UpvoteButton {...defaultProps} />
      </div>
    )

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ upvotes: 6 }),
    })

    fireEvent.click(screen.getByLabelText("Upvote"))
    expect(parentHandler).not.toHaveBeenCalled()
  })
})
