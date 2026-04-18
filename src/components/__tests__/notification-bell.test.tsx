import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, within } from "@testing-library/react"

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock("next/link", () => {
  function MockLink({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) {
    return <a href={href} {...props}>{children}</a>
  }
  MockLink.displayName = "MockLink"
  return MockLink
})

import { NotificationBell } from "@/components/notification-bell"

const mockInviteNotification = {
  id: "notif-1",
  userId: "user-1",
  type: "CLIQUE_INVITE",
  read: false,
  createdAt: new Date().toISOString(),
  payload: {
    type: "CLIQUE_INVITE",
    cliqueId: "clique-1",
    cliqueName: "Weekend Crew",
    invitedById: "user-2",
    invitedByName: "Alice",
    inviteToken: "tok123",
  },
}

const readNotification = { ...mockInviteNotification, id: "notif-2", read: true }

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the bell button with no badge when there are no notifications", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(<NotificationBell />)

    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
    })
  })

  it("shows an unread badge with the correct count", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockInviteNotification]),
    }) as typeof fetch

    render(<NotificationBell />)

    expect(await screen.findByTestId("unread-badge")).toHaveTextContent("1")
    expect(
      screen.getByRole("button", { name: /1 unread notification/i })
    ).toBeInTheDocument()
  })

  it("caps the badge at 9+", async () => {
    const manyNotifs = Array.from({ length: 10 }, (_, i) => ({
      ...mockInviteNotification,
      id: `notif-${i}`,
    }))
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manyNotifs),
    }) as typeof fetch

    render(<NotificationBell />)

    expect(await screen.findByTestId("unread-badge")).toHaveTextContent("9+")
  })

  it("opens the dropdown and shows a clique invite notification", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockInviteNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    // Wait for initial fetch to resolve before opening
    await screen.findByTestId("unread-badge")

    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(screen.getByText(/alice invited you to/i)).toBeInTheDocument()
    expect(screen.getByText("Weekend Crew")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /alice invited you to/i })).toHaveAttribute(
      "href",
      "/invite/tok123"
    )
  })

  it("shows an empty state when there are no notifications", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(<NotificationBell />)
    await user.click(screen.getByRole("button", { name: /notifications/i }))

    expect(await screen.findByText("No notifications yet.")).toBeInTheDocument()
  })

  it("shows the Mark all read button only when there are unread notifications", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockInviteNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(screen.getByRole("button", { name: /mark all read/i })).toBeInTheDocument()
  })

  it("does not show Mark all read when all are read", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([readNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    // No badge for all-read — wait for fetch to be called, then open
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole("button", { name: /notifications/i }))

    expect(await screen.findByText("Weekend Crew")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument()
  })

  it("marks all notifications as read when the button is clicked", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockInviteNotification]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockInviteNotification]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: 1 }),
      })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))
    const markAllBtn = screen.getByRole("button", { name: /mark all read/i })

    await user.click(markAllBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications", { method: "PATCH" })
    })
    await waitFor(() => {
      expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
    })
  })

  it("reloads notifications silently when the dropdown is reopened", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockInviteNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")

    // Open → notifications appear
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))
    expect(screen.getByText("Weekend Crew")).toBeInTheDocument()

    // Close → panel hidden
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))
    expect(screen.queryByText("Weekend Crew")).not.toBeInTheDocument()

    // Reopen → notifications shown again immediately (no spinner)
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))
    expect(await screen.findByText("Weekend Crew")).toBeInTheDocument()

    // fetch called: mount + open1 + open2 = 3
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })

  it("handles a failed notifications fetch gracefully (no error thrown)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network")) as typeof fetch

    render(<NotificationBell />)

    // Should render without throwing
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
    })
  })
})
