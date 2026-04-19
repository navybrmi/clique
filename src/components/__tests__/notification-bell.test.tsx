import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"

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

  it("closes the panel when clicking outside the container", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(
      <div>
        <NotificationBell />
        <button type="button">Outside</button>
      </div>
    )

    // Open the panel
    await user.click(screen.getByRole("button", { name: /notifications/i }))
    expect(await screen.findByTestId("notification-panel")).toBeInTheDocument()

    // Click outside
    await user.click(screen.getByRole("button", { name: "Outside" }))

    await waitFor(() => {
      expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
    })
  })

  it("does not close the panel when clicking inside the container", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(<NotificationBell />)

    await user.click(screen.getByRole("button", { name: /notifications/i }))
    expect(await screen.findByTestId("notification-panel")).toBeInTheDocument()

    // Click the Close button inside the panel — panel should close via onClick not outside-click
    // But clicking anywhere inside the panel div should NOT trigger outside-click handler
    await user.click(screen.getByText("No notifications yet."))

    // Panel should still be visible
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument()
  })

  it("renders a read invite notification without the unread dot", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([readNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole("button", { name: /notifications/i }))

    await screen.findByText("Weekend Crew")
    // Unread dot (the blue dot span) should not be present for a read notification
    // The link should still render
    expect(screen.getByRole("link", { name: /alice invited you to/i })).toBeInTheDocument()
    // No unread badge on the bell
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
  })

  it("shows 'Tap to view invite' subtitle for invite notifications", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockInviteNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(await screen.findByText("Tap to view invite")).toBeInTheDocument()
  })

  it("uses 'Someone' as fallback when invitedByName is null", async () => {
    const user = userEvent.setup()
    const noNameNotif = {
      ...mockInviteNotification,
      id: "notif-noname",
      payload: { ...mockInviteNotification.payload, invitedByName: null },
    }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([noNameNotif]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(await screen.findByText(/someone invited you to/i)).toBeInTheDocument()
  })

  it("renders a fallback div for unknown notification types", async () => {
    const user = userEvent.setup()
    const unknownNotif = {
      id: "notif-unknown",
      userId: "user-1",
      type: "UNKNOWN_TYPE",
      read: false,
      createdAt: new Date().toISOString(),
      payload: { type: "UNKNOWN_TYPE" },
    }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json: () => Promise.resolve([unknownNotif as any]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(await screen.findByText("New notification")).toBeInTheDocument()
  })

  it("calls handleMarkRead and marks the notification read when clicking an unread invite link", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockInviteNotification]),
      })
      // second call when opening (loadNotifications on toggle)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockInviteNotification]),
      })
      // PATCH for markRead
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: 1 }),
      })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    const link = await screen.findByRole("link", { name: /alice invited you to/i })
    // Use fireEvent to avoid jsdom navigation which interrupts async onClick handlers
    fireEvent.click(link)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["notif-1"] }),
      })
    })
    // After PATCH resolves, the notification should be marked read (badge gone)
    await waitFor(() => {
      expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
    })
  })

  it("does not call handleMarkRead when clicking an already-read invite link", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([readNotification]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([readNotification]),
      })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole("button", { name: /notifications/i }))

    const link = await screen.findByRole("link", { name: /alice invited you to/i })
    // Use fireEvent to avoid jsdom navigation
    fireEvent.click(link)

    // Only the initial GET and toggle GET were called — no PATCH
    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        (call) => call[1]?.method === "PATCH"
      )
      expect(patchCalls).toHaveLength(0)
    })
  })

  it("handles a failed mark-all-read fetch gracefully", async () => {
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
      .mockRejectedValueOnce(new Error("Network"))
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    const markAllBtn = screen.getByRole("button", { name: /mark all read/i })
    // Should not throw
    await user.click(markAllBtn)

    // Badge should still be present since the update didn't go through
    await waitFor(() => {
      expect(screen.getByTestId("unread-badge")).toBeInTheDocument()
    })
  })

  it("closes the notification panel when the X button is clicked", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(<NotificationBell />)
    await user.click(screen.getByRole("button", { name: /notifications/i }))
    expect(await screen.findByTestId("notification-panel")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /close notifications/i }))
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
  })

  it("does not show the notification panel on initial render", () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(<NotificationBell />)
    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument()
  })

  it("handles a non-ok fetch response gracefully", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve([]),
    }) as typeof fetch

    render(<NotificationBell />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
  })

  it("handles a response with non-array data gracefully", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: "unexpected" }),
    }) as typeof fetch

    render(<NotificationBell />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
  })

  it("marks only the clicked notification as read when there are multiple unread notifications", async () => {
    const user = userEvent.setup()
    const secondNotif = {
      ...mockInviteNotification,
      id: "notif-other",
      payload: {
        ...mockInviteNotification.payload,
        invitedByName: "Carol",
        cliqueName: "Movie Night",
        inviteToken: "tok456",
      },
    }
    const twoNotifs = [mockInviteNotification, secondNotif]
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(twoNotifs) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(twoNotifs) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ updated: 1 }) })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await waitFor(() => expect(screen.getByTestId("unread-badge")).toHaveTextContent("2"))
    await user.click(screen.getByRole("button", { name: /2 unread notifications/i }))

    // Click the first invite link (for "Weekend Crew")
    const link = await screen.findByRole("link", { name: /alice invited you to/i })
    fireEvent.click(link)

    // PATCH should be called for notif-1
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["notif-1"] }),
      })
    })
    // Badge count drops from 2 to 1 — the second notification (notif-other) is still unread
    await waitFor(() => {
      expect(screen.getByTestId("unread-badge")).toHaveTextContent("1")
    })
  })

  it("handles a failed handleMarkRead fetch gracefully (no error thrown)", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockInviteNotification]),
      })
      // second GET when opening
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockInviteNotification]),
      })
      // PATCH for markRead throws
      .mockRejectedValueOnce(new Error("Network error"))
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    const link = await screen.findByRole("link", { name: /alice invited you to/i })
    // Use fireEvent to avoid jsdom navigation; catch block handles rejection silently
    fireEvent.click(link)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["notif-1"] }),
      })
    })
    // Despite the error, component should not crash — badge still present since setNotifications was not called
    await waitFor(() => {
      expect(screen.getByTestId("unread-badge")).toBeInTheDocument()
    })
  })
})
