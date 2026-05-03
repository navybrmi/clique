import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { ActionsSidebar } from "@/components/actions-sidebar"

jest.mock("@/components/add-to-cliques-dialog", () => ({
  AddToCliquesDialog: ({
    trigger,
    recommendationId,
  }: {
    trigger?: React.ReactElement
    recommendationId: string
  }) => (
    <div>
      {trigger}
      <div data-testid={`add-to-cliques-dialog-${recommendationId}`} />
    </div>
  ),
}))

// Mock fetch
global.fetch = jest.fn()

const mockRecommendation = {
  id: "rec1",
  _count: {
    comments: 5,
    upvotes: 10,
  },
}

describe("ActionsSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("without cliqueId (public feed context)", () => {
    it("should render comment count but not upvote button", () => {
      render(<ActionsSidebar recommendation={mockRecommendation} />)
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.queryByLabelText(/upvote/i)).not.toBeInTheDocument()
      expect(screen.queryByText("10")).not.toBeInTheDocument()
    })
  })

  describe("with cliqueId (clique feed context)", () => {
    it("should render both upvote button and comment count", () => {
      render(
        <ActionsSidebar
          recommendation={mockRecommendation}
          cliqueId="clique1"
          initialHasUpvoted={false}
        />
      )
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByLabelText("Upvote")).toBeInTheDocument()
    })

    it("should show 'Remove upvote' label when already upvoted", () => {
      render(
        <ActionsSidebar
          recommendation={mockRecommendation}
          cliqueId="clique1"
          initialHasUpvoted={true}
        />
      )
      expect(screen.getByLabelText("Remove upvote")).toBeInTheDocument()
    })

    it("should call POST when upvote button is clicked and not yet upvoted", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ upvotes: 11 }),
      })

      render(
        <ActionsSidebar
          recommendation={mockRecommendation}
          cliqueId="clique1"
          initialHasUpvoted={false}
        />
      )

      fireEvent.click(screen.getByLabelText("Upvote"))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/recommendations/rec1/upvotes?cliqueId=clique1",
          { method: "POST" }
        )
      })

      await waitFor(() => expect(screen.getByText("11")).toBeInTheDocument())
      expect(screen.getByLabelText("Remove upvote")).toBeInTheDocument()
    })

    it("should call DELETE when upvote button is clicked and already upvoted", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ upvotes: 9 }),
      })

      render(
        <ActionsSidebar
          recommendation={mockRecommendation}
          cliqueId="clique1"
          initialHasUpvoted={true}
        />
      )

      fireEvent.click(screen.getByLabelText("Remove upvote"))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/recommendations/rec1/upvotes",
          { method: "DELETE" }
        )
      })

      await waitFor(() => expect(screen.getByText("9")).toBeInTheDocument())
      expect(screen.getByLabelText("Upvote")).toBeInTheDocument()
    })

    it("should not update state when fetch fails", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })

      render(
        <ActionsSidebar
          recommendation={mockRecommendation}
          cliqueId="clique1"
          initialHasUpvoted={false}
        />
      )

      fireEvent.click(screen.getByLabelText("Upvote"))

      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByLabelText("Upvote")).toBeInTheDocument()
    })
  })

  describe("Save button (Add to Clique)", () => {
    it("should not render Save button when currentUserId is absent", () => {
      render(<ActionsSidebar recommendation={mockRecommendation} />)
      expect(screen.queryByLabelText("Add to your clique(s)")).not.toBeInTheDocument()
      expect(screen.queryByText("Save")).not.toBeInTheDocument()
    })

    it("should render Save button when currentUserId is provided", () => {
      render(
        <ActionsSidebar recommendation={mockRecommendation} currentUserId="user1" />
      )
      expect(screen.getByLabelText("Add to your clique(s)")).toBeInTheDocument()
      expect(screen.getByText("Save")).toBeInTheDocument()
    })

    it("should render AddToCliquesDialog trigger when currentUserId is provided", () => {
      const rec = { ...mockRecommendation, entity: { name: "Test Movie" } }
      render(<ActionsSidebar recommendation={rec} currentUserId="user1" />)
      expect(screen.getByTestId(`add-to-cliques-dialog-${rec.id}`)).toBeInTheDocument()
    })

    it("should not render AddToCliquesDialog when currentUserId is absent", () => {
      render(<ActionsSidebar recommendation={mockRecommendation} />)
      expect(
        screen.queryByTestId(`add-to-cliques-dialog-${mockRecommendation.id}`)
      ).not.toBeInTheDocument()
    })
  })

  describe("comment count updates", () => {
    it("should update comment count when commentUpdated event is fired", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _count: { comments: 6, upvotes: 10 } }),
      })

      render(
        <ActionsSidebar recommendation={mockRecommendation} cliqueId="clique1" />
      )

      expect(screen.getByText("5")).toBeInTheDocument()

      window.dispatchEvent(new CustomEvent("commentUpdated"))

      await waitFor(() => {
        expect(screen.getAllByText("6").length).toBeGreaterThan(0)
      })
      expect(global.fetch).toHaveBeenCalledWith("/api/recommendations/rec1")
    })

    it("should call onCommentCountChange callback when count updates", async () => {
      const mockCallback = jest.fn()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _count: { comments: 7, upvotes: 10 } }),
      })

      render(
        <ActionsSidebar
          recommendation={mockRecommendation}
          onCommentCountChange={mockCallback}
        />
      )

      window.dispatchEvent(new CustomEvent("commentUpdated"))

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith(7)
      })
    })

    it("should handle fetch errors gracefully", async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      render(<ActionsSidebar recommendation={mockRecommendation} />)

      window.dispatchEvent(new CustomEvent("commentUpdated"))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error updating comment count:",
          expect.any(Error)
        )
      })

      expect(screen.getByText("5")).toBeInTheDocument()
      consoleSpy.mockRestore()
    })
  })
})
