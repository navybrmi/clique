import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { ActionsSidebar } from "@/components/actions-sidebar"

// Mock fetch
global.fetch = jest.fn()

describe("ActionsSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render initial comment and upvote counts", () => {
    const mockRecommendation = {
      id: "rec1",
      _count: {
        comments: 5,
        upvotes: 10,
      },
    }

    render(<ActionsSidebar recommendation={mockRecommendation} />)

    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
  })

  it("should update comment count when commentUpdated event is fired", async () => {
    const mockRecommendation = {
      id: "rec1",
      _count: {
        comments: 5,
        upvotes: 10,
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _count: {
          comments: 6,
          upvotes: 10,
        },
      }),
    })

    render(<ActionsSidebar recommendation={mockRecommendation} />)

    // Initial render shows 5 comments
    expect(screen.getByText("5")).toBeInTheDocument()

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("commentUpdated"))

    // Wait for count to update to 6
    await waitFor(() => {
      const commentCounts = screen.getAllByText("6")
      expect(commentCounts.length).toBeGreaterThan(0)
    })

    expect(global.fetch).toHaveBeenCalledWith("/api/recommendations/rec1")
  })

  it("should call onCommentCountChange callback when count updates", async () => {
    const mockRecommendation = {
      id: "rec1",
      _count: {
        comments: 5,
        upvotes: 10,
      },
    }

    const mockCallback = jest.fn()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _count: {
          comments: 7,
          upvotes: 10,
        },
      }),
    })

    render(
      <ActionsSidebar
        recommendation={mockRecommendation}
        onCommentCountChange={mockCallback}
      />
    )

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("commentUpdated"))

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith(7)
    })
  })

  it("should handle fetch errors gracefully", async () => {
    const mockRecommendation = {
      id: "rec1",
      _count: {
        comments: 5,
        upvotes: 10,
      },
    }

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    )

    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    render(<ActionsSidebar recommendation={mockRecommendation} />)

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("commentUpdated"))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error updating comment count:",
        expect.any(Error)
      )
    })

    // Count should remain unchanged
    expect(screen.getByText("5")).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
