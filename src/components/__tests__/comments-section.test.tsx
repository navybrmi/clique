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

  it("should render initial comments in a valid clique context", () => {
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
        cliqueId="clq1"
        canComment={true}
      />
    )

    expect(screen.getByText("Comments (1)")).toBeInTheDocument()
    expect(screen.getByText("Great recommendation!")).toBeInTheDocument()
    expect(screen.getByText("John")).toBeInTheDocument()
  })

  it("should show 'No comments yet' when the clique thread is empty", () => {
    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={[]}
        initialCount={0}
        cliqueId="clq1"
        canComment={true}
      />
    )

    expect(screen.getByText("Comments (0)")).toBeInTheDocument()
    expect(screen.getByText("No comments yet")).toBeInTheDocument()
  })

  it("shows a clique prompt with links when there is no clique context", () => {
    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={[]}
        initialCount={0}
        canComment={false}
        userCliques={[{ id: "clq1", name: "Movie Buffs" }]}
      />
    )

    // No thread/post UI is rendered.
    expect(screen.queryByTestId("add-comment-btn")).not.toBeInTheDocument()
    // A link to open the reco within the user's clique is shown.
    const link = screen.getByRole("link", { name: /Movie Buffs/i })
    expect(link).toHaveAttribute("href", "/recommendations/rec1?cliqueId=clq1")
  })

  it("prompts to add the reco to a clique when the user has none containing it", () => {
    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={[]}
        initialCount={0}
        canComment={false}
        userCliques={[]}
      />
    )

    expect(screen.queryByTestId("add-comment-btn")).not.toBeInTheDocument()
    expect(
      screen.getByText(/Add this recommendation to one of your cliques/i)
    ).toBeInTheDocument()
  })

  it("should refresh the clique thread when onCommentAdded is called", async () => {
    const mockComments = [
      {
        id: "1",
        content: "First comment",
        createdAt: "2026-02-06T12:00:00Z",
        user: { id: "user1", name: "John", image: null },
      },
    ]

    const newComments = [
      ...mockComments,
      {
        id: "2",
        content: "Second comment",
        createdAt: "2026-02-06T13:00:00Z",
        user: { id: "user2", name: "Jane", image: null },
      },
    ]

    ;(global.fetch as jest.Mock).mockImplementation(() =>
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
        cliqueId="clq1"
        canComment={true}
      />
    )

    expect(screen.getByText("Comments (1)")).toBeInTheDocument()

    await user.click(screen.getByTestId("add-comment-btn"))

    await waitFor(
      () => {
        expect(screen.getByText("Comments (2)")).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // The refresh fetch is scoped to the active clique.
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/recommendations/rec1?cliqueId=clq1"
    )
  })

  it("should handle fetch errors gracefully", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"))

    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={[]}
        initialCount={0}
        cliqueId="clq1"
        canComment={true}
      />
    )

    await user.click(screen.getByTestId("add-comment-btn"))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error refreshing comments:",
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  it("should show delete button for current user's comments", () => {
    const mockComments = [
      {
        id: "1",
        content: "My comment",
        createdAt: "2026-02-06T12:00:00Z",
        user: { id: "current-user", name: "Me", image: null },
      },
    ]

    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={mockComments}
        initialCount={1}
        currentUserId="current-user"
        cliqueId="clq1"
        canComment={true}
      />
    )

    expect(screen.getByRole("button", { name: /delete comment/i })).toBeInTheDocument()
  })

  it("should not show delete button for other users' comments", () => {
    const mockComments = [
      {
        id: "1",
        content: "Someone else's comment",
        createdAt: "2026-02-06T12:00:00Z",
        user: { id: "other-user", name: "Other", image: null },
      },
    ]

    render(
      <CommentsSection
        recommendationId="rec1"
        initialComments={mockComments}
        initialCount={1}
        currentUserId="current-user"
        cliqueId="clq1"
        canComment={true}
      />
    )

    expect(screen.queryByRole("button", { name: /delete comment/i })).not.toBeInTheDocument()
  })
})
