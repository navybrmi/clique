import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CommentsSection } from "@/components/comments-section"

// Mock the AddCommentForm component
jest.mock("@/components/add-comment-form", () => ({
  AddCommentForm: ({ onCommentAdded }: any) => (
    <button onClick={onCommentAdded} data-testid="add-comment-btn">
      Mock Add Comment
    </button>
  ),
}))

// Mock fetch
global.fetch = jest.fn()

describe("CommentsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render initial comments", () => {
    const mockComments = [
      {
        id: "1",
        content: "Great recommendation!",
        createdAt: "2026-02-06T12:00:00Z",
        user: { id: "user1", name: "John", image: null },
      },
    ]

    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={mockComments}
        initialCount={1}
      />
    )

    expect(screen.getByText("Comments (1)")).toBeInTheDocument()
    expect(screen.getByText("Great recommendation!")).toBeInTheDocument()
    expect(screen.getByText("John")).toBeInTheDocument()
  })

  it("should show 'No comments yet' when no comments", () => {
    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={[]}
        initialCount={0}
      />
    )

    expect(screen.getByText("Comments (0)")).toBeInTheDocument()
    expect(screen.getByText("No comments yet")).toBeInTheDocument()
  })

  it("should refresh comments when onCommentAdded is called", async () => {
    const mockComments = [
      {
        id: "1",
        content: "First comment",
        createdAt: "2026-02-06T12:00:00Z",
        user: { id: "user1", name: "John", image: null },
      },
    ]

    const newComments = [
      {
        id: "1",
        content: "First comment",
        createdAt: "2026-02-06T12:00:00Z",
        user: { id: "user1", name: "John", image: null },
      },
      {
        id: "2",
        content: "Second comment",
        createdAt: "2026-02-06T13:00:00Z",
        user: { id: "user2", name: "Jane", image: null },
      },
    ]

    // Set up mock to resolve successfully
    ;(global.fetch as jest.Mock).mockImplementation(
      (url) =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            comments: newComments,
            _count: { comments: 2 },
          }),
        })
    )

    const user = userEvent.setup()
    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={mockComments}
        initialCount={1}
      />
    )

    // Verify initial state
    expect(screen.getByText("Comments (1)")).toBeInTheDocument()

    const addButton = screen.getByTestId("add-comment-btn")
    await user.click(addButton)

    // Wait for the fetch to complete and state to update
    await waitFor(
      () => {
        expect(screen.getByText("Comments (2)")).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/recommendations/rec1"
    )
  })

  it("should handle fetch errors gracefully", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(
      new Error("Network error")
    )

    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={[]}
        initialCount={0}
      />
    )

    const addButton = screen.getByTestId("add-comment-btn")
    await user.click(addButton)

    // Wait for the error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error refreshing comments:",
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})
