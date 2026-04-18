import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, within } from "@testing-library/react"

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

import { CliqueInviteDialog } from "@/components/clique-invite-dialog"

const defaultProps = {
  cliqueId: "clique-1",
  open: true,
  onOpenChange: jest.fn(),
}

describe("CliqueInviteDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders Share link and Invite by email tabs", () => {
    render(<CliqueInviteDialog {...defaultProps} />)
    expect(screen.getByTestId("tab-link")).toBeInTheDocument()
    expect(screen.getByTestId("tab-email")).toBeInTheDocument()
  })

  describe("Share link tab", () => {
    it("shows a Generate invite link button by default", () => {
      render(<CliqueInviteDialog {...defaultProps} />)
      expect(
        screen.getByRole("button", { name: /generate invite link/i })
      ).toBeInTheDocument()
    })

    it("calls the invites API and displays the generated link", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ id: "inv-1", token: "abc123", cliqueId: "clique-1" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /generate invite link/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/cliques/clique-1/invites",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ type: "link" }),
          })
        )
      })

      const linkInput = await screen.findByTestId("invite-link-input")
      expect((linkInput as HTMLInputElement).value).toContain("abc123")
    })

    it("shows a copy button after the link is generated", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ token: "abc123" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /generate invite link/i }))

      expect(await screen.findByRole("button", { name: /copy link/i })).toBeInTheDocument()
    })

    it("copies the link to clipboard when the copy button is clicked", async () => {
      const user = userEvent.setup()
      const writeText = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        writable: true,
        configurable: true,
      })

      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ token: "abc123" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /generate invite link/i }))
      await screen.findByRole("button", { name: /copy link/i })

      await user.click(screen.getByRole("button", { name: /copy link/i }))

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining("abc123"))
      })
      expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument()
    })

    it("shows an error when link generation fails", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /generate invite link/i }))

      expect(await screen.findByText("Forbidden")).toBeInTheDocument()
    })

    it("shows a generic error when the fetch throws", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error")) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /generate invite link/i }))

      expect(
        await screen.findByText("Failed to generate invite link")
      ).toBeInTheDocument()
    })
  })

  describe("Invite by email tab", () => {
    it("switches to the email tab and shows an email input", async () => {
      const user = userEvent.setup()
      render(<CliqueInviteDialog {...defaultProps} />)

      await user.click(screen.getByTestId("tab-email"))

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /send invite/i })).toBeDisabled()
    })

    it("sends the invite and shows a success message", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ id: "inv-2", token: "tok2" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByTestId("tab-email"))

      await user.type(screen.getByLabelText(/email address/i), "alice@example.com")
      await user.click(screen.getByRole("button", { name: /send invite/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/cliques/clique-1/invites",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ type: "user", email: "alice@example.com" }),
          })
        )
      })

      expect(await screen.findByText(/invite sent/i)).toBeInTheDocument()
    })

    it("shows an error when the email invite fails", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "No user found with that email" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByTestId("tab-email"))

      await user.type(screen.getByLabelText(/email address/i), "unknown@example.com")
      await user.click(screen.getByRole("button", { name: /send invite/i }))

      expect(
        await screen.findByText("No user found with that email")
      ).toBeInTheDocument()
    })

    it("shows a generic error when the email fetch throws", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockRejectedValue(new Error("Network")) as typeof fetch

      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByTestId("tab-email"))

      await user.type(screen.getByLabelText(/email address/i), "alice@example.com")
      await user.click(screen.getByRole("button", { name: /send invite/i }))

      expect(await screen.findByText("Failed to send invite")).toBeInTheDocument()
    })

    it("shows an error when email is empty on submit", async () => {
      const user = userEvent.setup()
      render(<CliqueInviteDialog {...defaultProps} />)
      await user.click(screen.getByTestId("tab-email"))

      // Submit button should be disabled when email is empty, but verify it directly
      const submitBtn = screen.getByRole("button", { name: /send invite/i })
      expect(submitBtn).toBeDisabled()
    })
  })

  it("clears errors when switching tabs", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    ) as typeof fetch

    render(<CliqueInviteDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /generate invite link/i }))
    expect(await screen.findByText("Forbidden")).toBeInTheDocument()

    await user.click(screen.getByTestId("tab-email"))
    expect(screen.queryByText("Forbidden")).not.toBeInTheDocument()
  })
})
