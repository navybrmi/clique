import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { AcceptInviteButton } from "../accept-invite-button"

describe("AcceptInviteButton", () => {
  // jsdom defines `window.location` and its `href` accessor as non-configurable, so neither
  // can be replaced or spied on in this environment (Object.defineProperty throws). Assigning
  // location.href in jsdom is a silent no-op (logs an unimplemented-navigation warning rather
  // than throwing), so redirect behavior is instead verified indirectly: neither the error
  // text nor the pending panel renders, proving execution reached the final redirect branch.

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders "Request to join" for a link invite', () => {
    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    expect(screen.getByRole("button", { name: /request to join/i })).toBeInTheDocument()
  })

  it('renders "Accept invite" for a user invite', () => {
    render(<AcceptInviteButton token="tok123" isLinkInvite={false} />)
    expect(screen.getByRole("button", { name: /accept invite/i })).toBeInTheDocument()
  })

  it("falls through to the redirect branch on a successful direct accept", async () => {
    // jsdom logs (but doesn't throw on) "Not implemented: navigation" for the
    // `window.location.href =` assignment — expected noise, not a real error.
    jest.spyOn(console, "error").mockImplementation()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Invite accepted", cliqueId: "clique-1" }),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={false} />)
    fireEvent.click(screen.getByRole("button", { name: /accept invite/i }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /accept invite/i })).not.toBeDisabled()
    )
    expect(screen.queryByText("Request submitted!")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /sending request/i })).not.toBeInTheDocument()
  })

  it("shows the pending panel with an explore-the-app link when the request is pending", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "pending" }),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    fireEvent.click(screen.getByRole("button", { name: /request to join/i }))

    await waitFor(() => expect(screen.getByText("Request submitted!")).toBeInTheDocument())
    const exploreLink = screen.getByRole("link", { name: /browse the app while you wait/i })
    expect(exploreLink).toHaveAttribute("href", "/")
  })

  it("shows the pending panel with an explore-the-app link when a request was already pending", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "already_pending" }),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    fireEvent.click(screen.getByRole("button", { name: /request to join/i }))

    await waitFor(() => expect(screen.getByText("Request submitted!")).toBeInTheDocument())
    expect(screen.getByRole("link", { name: /browse the app while you wait/i })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("falls through to the redirect branch when the response indicates the user is already a member", async () => {
    jest.spyOn(console, "error").mockImplementation()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "already_member", cliqueId: "clique-1" }),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    fireEvent.click(screen.getByRole("button", { name: /request to join/i }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /request to join/i })).not.toBeDisabled()
    )
    expect(screen.queryByText("Request submitted!")).not.toBeInTheDocument()
  })

  it("shows the user-invite pending copy (not the link-invite copy) when isLinkInvite is false", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "pending" }),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={false} />)
    fireEvent.click(screen.getByRole("button", { name: /accept invite/i }))

    await waitFor(() =>
      expect(screen.getByText("Your request is pending approval.")).toBeInTheDocument()
    )
  })

  it("falls back to a generic error message when the failed response has no error field", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    fireEvent.click(screen.getByRole("button", { name: /request to join/i }))

    await waitFor(() =>
      expect(screen.getByText("Failed to accept invite")).toBeInTheDocument()
    )
  })

  it("shows an error message and no pending panel when the request fails", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "This invite link has expired" }),
    })

    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    fireEvent.click(screen.getByRole("button", { name: /request to join/i }))

    await waitFor(() =>
      expect(screen.getByText("This invite link has expired")).toBeInTheDocument()
    )
    expect(screen.queryByText("Request submitted!")).not.toBeInTheDocument()
  })

  it("shows a fallback error message when the fetch throws", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("network down"))

    render(<AcceptInviteButton token="tok123" isLinkInvite={true} />)
    fireEvent.click(screen.getByRole("button", { name: /request to join/i }))

    await waitFor(() =>
      expect(screen.getByText("Failed to accept invite")).toBeInTheDocument()
    )
  })
})
