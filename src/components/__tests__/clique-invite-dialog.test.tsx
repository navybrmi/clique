import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor } from "@testing-library/react"

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

import { CliqueInviteDialog } from "@/components/clique-invite-dialog"

const defaultProps = {
  cliqueId: "clique-1",
  cliqueName: "Weekend Crew",
  open: true,
  onOpenChange: jest.fn(),
}

describe("CliqueInviteDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the dialog with the clique name in the title", () => {
    render(<CliqueInviteDialog {...defaultProps} />)
    expect(screen.getByRole("heading", { name: /invite to weekend crew/i })).toBeInTheDocument()
  })

  it("shows a Generate invite link button by default", () => {
    render(<CliqueInviteDialog {...defaultProps} />)
    expect(
      screen.getByRole("button", { name: /generate invite link/i })
    ).toBeInTheDocument()
  })

  it("calls the invites API and displays the generated link", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "inv-1", token: "abc123", cliqueId: "clique-1" }),
    }) as typeof fetch

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
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "abc123" }),
    }) as typeof fetch

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

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "abc123" }),
    }) as typeof fetch

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
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Forbidden" }),
    }) as typeof fetch

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

  it("resets state when the dialog is closed and reopened", async () => {
    const user = userEvent.setup()
    const onOpenChange = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "abc123" }),
    }) as typeof fetch

    render(<CliqueInviteDialog {...defaultProps} onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole("button", { name: /generate invite link/i }))
    await screen.findByTestId("invite-link-input")

    // Close the dialog
    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
