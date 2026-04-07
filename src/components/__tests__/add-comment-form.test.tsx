import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddCommentForm } from "../add-comment-form"

describe("AddCommentForm", () => {
  describe("when userId is falsy", () => {
    it("shows sign-in prompt when userId is null", () => {
      render(
        <AddCommentForm recommendationId="rec-1" userId={null} />
      )
      expect(screen.getByText("Sign in to add a comment")).toBeInTheDocument()
    })

    it("shows sign-in prompt when userId is undefined", () => {
      render(<AddCommentForm recommendationId="rec-1" />)
      expect(screen.getByText("Sign in to add a comment")).toBeInTheDocument()
    })

    it("does not render the comment form when userId is falsy", () => {
      render(<AddCommentForm recommendationId="rec-1" userId={null} />)
      expect(screen.queryByPlaceholderText("Add a comment...")).not.toBeInTheDocument()
    })
  })

  describe("when userId is provided", () => {
    it("renders the comment textarea", () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      expect(screen.getByPlaceholderText("Add a comment...")).toBeInTheDocument()
    })

    it("renders the Post Comment button", () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      expect(screen.getByRole("button", { name: /post comment/i })).toBeInTheDocument()
    })

    it("renders the Clear button", () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument()
    })

    it("does not show sign-in prompt", () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      expect(screen.queryByText("Sign in to add a comment")).not.toBeInTheDocument()
    })
  })

  describe("submit button disabled state", () => {
    it("disables the submit button when comment is empty", () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled()
    })

    it("disables the clear button when comment is empty", () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled()
    })

    it("enables submit and clear buttons when comment has text", async () => {
      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      await user.type(screen.getByPlaceholderText("Add a comment..."), "Hello")
      expect(screen.getByRole("button", { name: /post comment/i })).not.toBeDisabled()
      expect(screen.getByRole("button", { name: /clear/i })).not.toBeDisabled()
    })

    it("disables submit button when comment is only whitespace", async () => {
      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      await user.type(screen.getByPlaceholderText("Add a comment..."), "   ")
      expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled()
    })
  })

  describe("form validation", () => {
    it("shows error when submitting empty comment", async () => {
      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      // Type and then clear to get an edge case — actually trigger via fireEvent to bypass disabled
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "   " } })
      const form = textarea.closest("form")!
      fireEvent.submit(form)
      await waitFor(() => {
        expect(screen.getByText("Comment cannot be empty")).toBeInTheDocument()
      })
    })

    it("shows error when comment exceeds 500 characters", async () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      const longComment = "a".repeat(501)
      fireEvent.change(textarea, { target: { value: longComment } })
      const form = textarea.closest("form")!
      fireEvent.submit(form)
      await waitFor(() => {
        expect(screen.getByText("Comment must be 500 characters or less")).toBeInTheDocument()
      })
    })

    it("does not show an error for a comment exactly 500 characters", async () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      const exactComment = "a".repeat(500)
      fireEvent.change(textarea, { target: { value: exactComment } })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      )

      const form = textarea.closest("form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.queryByText("Comment must be 500 characters or less")).not.toBeInTheDocument()
        expect(screen.queryByText("Comment cannot be empty")).not.toBeInTheDocument()
      })
    })
  })

  describe("successful submission", () => {
    it("POSTs to the correct API endpoint", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      )

      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-42" userId="user-123" />)
      await user.type(screen.getByPlaceholderText("Add a comment..."), "Great post!")
      await user.click(screen.getByRole("button", { name: /post comment/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/recommendations/rec-42/comments",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: "Great post!" }),
          })
        )
      })
    })

    it("clears the textarea after successful submission", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      await user.type(textarea, "Nice!")
      await user.click(screen.getByRole("button", { name: /post comment/i }))

      await waitFor(() => {
        expect(textarea).toHaveValue("")
      })
    })

    it("calls onCommentAdded callback after successful submission", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

      const onCommentAdded = jest.fn()
      const user = userEvent.setup()
      render(
        <AddCommentForm
          recommendationId="rec-1"
          userId="user-123"
          onCommentAdded={onCommentAdded}
        />
      )
      await user.type(screen.getByPlaceholderText("Add a comment..."), "Nice!")
      await user.click(screen.getByRole("button", { name: /post comment/i }))

      await waitFor(() => {
        expect(onCommentAdded).toHaveBeenCalledTimes(1)
      })
    })

    it("does not throw when onCommentAdded is not provided", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      await user.type(screen.getByPlaceholderText("Add a comment..."), "Nice!")
      await user.click(screen.getByRole("button", { name: /post comment/i }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Add a comment...")).toHaveValue("")
      })
    })

    it("trims whitespace from the comment before sending", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "  trimmed  " } })
      const form = textarea.closest("form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/recommendations/rec-1/comments",
          expect.objectContaining({
            body: JSON.stringify({ content: "trimmed" }),
          })
        )
      })
    })
  })

  describe("API error response", () => {
    it("displays error message from API response body", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "You are not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "Test comment" } })
      fireEvent.submit(textarea.closest("form")!)

      await waitFor(() => {
        expect(screen.getByText("You are not authorized")).toBeInTheDocument()
      })
    })

    it("displays fallback error when API response has no error field", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      )

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "Test comment" } })
      fireEvent.submit(textarea.closest("form")!)

      await waitFor(() => {
        expect(screen.getByText("Failed to add comment")).toBeInTheDocument()
      })
    })
  })

  describe("network error", () => {
    it("displays 'Failed to add comment' when fetch throws", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "Test comment" } })
      fireEvent.submit(textarea.closest("form")!)

      await waitFor(() => {
        expect(screen.getByText("Failed to add comment")).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it("logs the error to console.error when fetch throws", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()
      const networkError = new Error("Network error")
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(networkError)

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "Test comment" } })
      fireEvent.submit(textarea.closest("form")!)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error adding comment:",
          networkError
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe("submitting state", () => {
    it("disables the submit button while submitting", async () => {
      let resolveResponse: (value: any) => void
      const pendingResponse = new Promise((resolve) => {
        resolveResponse = resolve
      })
      ;(global.fetch as jest.Mock).mockReturnValueOnce(pendingResponse)

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "Test comment" } })
      fireEvent.submit(textarea.closest("form")!)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /posting/i })).toBeDisabled()
      })

      resolveResponse!(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    })

    it("shows 'Posting...' text while submitting", async () => {
      let resolveResponse: (value: any) => void
      const pendingResponse = new Promise((resolve) => {
        resolveResponse = resolve
      })
      ;(global.fetch as jest.Mock).mockReturnValueOnce(pendingResponse)

      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      fireEvent.change(textarea, { target: { value: "Test comment" } })
      fireEvent.submit(textarea.closest("form")!)

      await waitFor(() => {
        expect(screen.getByText(/posting/i)).toBeInTheDocument()
      })

      resolveResponse!(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    })
  })

  describe("clear button", () => {
    it("resets the comment text when clicked", async () => {
      const user = userEvent.setup()
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")
      await user.type(textarea, "Some text")
      expect(textarea).toHaveValue("Some text")

      await user.click(screen.getByRole("button", { name: /clear/i }))
      expect(textarea).toHaveValue("")
    })

    it("clears the error message when clicked", async () => {
      render(<AddCommentForm recommendationId="rec-1" userId="user-123" />)
      const textarea = screen.getByPlaceholderText("Add a comment...")

      // Trigger an error first
      fireEvent.change(textarea, { target: { value: "   " } })
      fireEvent.submit(textarea.closest("form")!)
      await waitFor(() => {
        expect(screen.getByText("Comment cannot be empty")).toBeInTheDocument()
      })

      // Now type something and clear
      fireEvent.change(textarea, { target: { value: "text" } })
      fireEvent.click(screen.getByRole("button", { name: /clear/i }))

      await waitFor(() => {
        expect(screen.queryByText("Comment cannot be empty")).not.toBeInTheDocument()
      })
    })
  })
})
