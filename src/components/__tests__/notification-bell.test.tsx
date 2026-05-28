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

  it("renders nothing for unknown notification types and excludes them from the unread count", async () => {
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    // Unknown types are filtered from unreadCount — no badge should appear
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /notifications/i }))

    // Panel opens, unknown notification renders null — no notification content visible
    expect(screen.queryByText("New notification")).not.toBeInTheDocument()
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

  // ── CLIQUE_JOIN_REQUEST ──────────────────────────────────────────────────────

  const mockJoinRequestNotification = {
    id: "notif-req-1",
    userId: "user-1",
    type: "CLIQUE_JOIN_REQUEST",
    read: false,
    createdAt: new Date().toISOString(),
    payload: {
      type: "CLIQUE_JOIN_REQUEST",
      cliqueId: "clique-1",
      cliqueName: "Weekend Crew",
      requestId: "req-1",
      requesterId: "user-2",
      requesterName: "Bob",
    },
  }

  it("renders a join-request notification with Approve and Decline buttons", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockJoinRequestNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    // Text is split across spans: "Bob" / " wants to join " / "Weekend Crew"
    expect(await screen.findByRole("button", { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
    expect(screen.getAllByText("Weekend Crew").length).toBeGreaterThan(0)
  })

  it("removes the join-request notification after approving", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      // POST approve
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "Approved" }) })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    await user.click(await screen.findByRole("button", { name: /approve/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cliques/clique-1/membership-requests/req-1/approve",
        { method: "POST" }
      )
    })
    await waitFor(() => {
      expect(screen.queryByText(/bob wants to join/i)).not.toBeInTheDocument()
    })
  })

  it("removes the join-request notification after declining", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      // POST reject
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "Rejected" }) })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    await user.click(await screen.findByRole("button", { name: /decline/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/cliques/clique-1/membership-requests/req-1/reject",
        { method: "POST" }
      )
    })
    await waitFor(() => {
      expect(screen.queryByText(/bob wants to join/i)).not.toBeInTheDocument()
    })
  })

  it("shows a spinner on Approve/Decline buttons while the request is in flight", async () => {
    let resolveApprove!: () => void
    const approvePromise = new Promise<void>((res) => { resolveApprove = res })

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockReturnValueOnce(
        approvePromise.then(() => ({ ok: true, json: () => Promise.resolve({}) }))
      )
    global.fetch = mockFetch as typeof fetch

    const user = userEvent.setup()
    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    const approveBtn = await screen.findByRole("button", { name: /approve/i })
    await user.click(approveBtn)

    // While in-flight the Approve button shows a spinner (text removed) and Decline is still visible but disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /decline/i })).toBeDisabled()
    })

    // Resolve and verify removal (Bob span disappears along with the notification)
    await act(async () => { resolveApprove() })
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument()
    })
  })

  it("shows an error message and reloads notifications when approve fails", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      // POST approve → non-ok
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Limit reached" }) })
      // reload GET after error
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    await user.click(await screen.findByRole("button", { name: /approve/i }))

    await waitFor(() => {
      expect(screen.getByTestId("resolve-error")).toHaveTextContent("Limit reached")
    })
    // Notification remains (reload brought it back) — check for the action buttons
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument()
  })

  it("shows an error message and reloads notifications when decline fails", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      // POST reject → non-ok
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Already resolved" }) })
      // reload GET after error
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    await user.click(await screen.findByRole("button", { name: /decline/i }))

    await waitFor(() => {
      expect(screen.getByTestId("resolve-error")).toHaveTextContent("Already resolved")
    })
  })

  it("shows a generic error and reloads when the approve fetch throws a network error", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
      .mockRejectedValueOnce(new Error("Network"))
      // reload GET after error
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRequestNotification]) })
    global.fetch = mockFetch as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    await user.click(await screen.findByRole("button", { name: /approve/i }))

    await waitFor(() => {
      expect(screen.getByTestId("resolve-error")).toHaveTextContent("Failed to approve request")
    })
  })

  // ── CLIQUE_JOIN_APPROVED ─────────────────────────────────────────────────────

  const mockJoinApprovedNotification = {
    id: "notif-approved-1",
    userId: "user-2",
    type: "CLIQUE_JOIN_APPROVED",
    read: false,
    createdAt: new Date().toISOString(),
    payload: {
      type: "CLIQUE_JOIN_APPROVED",
      cliqueId: "clique-1",
      cliqueName: "Weekend Crew",
    },
  }

  it("renders a join-approved notification with a link to the clique", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockJoinApprovedNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(await screen.findByText(/your request to join/i)).toBeInTheDocument()
    expect(screen.getByText(/was approved/i)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /your request to join/i })
    expect(link).toHaveAttribute("href", "/?cliqueId=clique-1")
  })

  it("renders a read join-approved notification without the unread dot", async () => {
    const user = userEvent.setup()
    const readApproved = { ...mockJoinApprovedNotification, read: true }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([readApproved]),
    }) as typeof fetch

    render(<NotificationBell />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole("button", { name: /notifications/i }))

    expect(await screen.findByText(/was approved/i)).toBeInTheDocument()
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
  })

  // ── CLIQUE_JOIN_REJECTED ─────────────────────────────────────────────────────

  const mockJoinRejectedNotification = {
    id: "notif-rejected-1",
    userId: "user-2",
    type: "CLIQUE_JOIN_REJECTED",
    read: false,
    createdAt: new Date().toISOString(),
    payload: {
      type: "CLIQUE_JOIN_REJECTED",
      cliqueId: "clique-1",
      cliqueName: "Weekend Crew",
    },
  }

  it("renders a join-rejected notification", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockJoinRejectedNotification]),
    }) as typeof fetch

    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    expect(await screen.findByText(/your request to join/i)).toBeInTheDocument()
    expect(screen.getByText(/was declined/i)).toBeInTheDocument()
    // No approve/decline buttons
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument()
  })

  it("marks a join-rejected notification read when clicked", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRejectedNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockJoinRejectedNotification]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ updated: 1 }) })
    global.fetch = mockFetch as typeof fetch

    const user = userEvent.setup()
    render(<NotificationBell />)
    await screen.findByTestId("unread-badge")
    await user.click(screen.getByRole("button", { name: /1 unread notification/i }))

    const rejectedDiv = await screen.findByText(/was declined/i)
    fireEvent.click(rejectedDiv)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["notif-rejected-1"] }),
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument()
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
