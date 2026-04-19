import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, within } from "@testing-library/react"

const mockRefresh = jest.fn()

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { CliqueManagementDialog } from "@/components/clique-management-dialog"

const mockClique = {
  id: "clique-1",
  name: "Weekend Crew",
  creatorId: "user-1",
  creator: { id: "user-1", name: "Alice", image: null },
  members: [
    {
      cliqueId: "clique-1",
      userId: "user-1",
      joinedAt: new Date().toISOString(),
      user: { id: "user-1", name: "Alice", image: null, email: "alice@example.com" },
    },
    {
      cliqueId: "clique-1",
      userId: "user-2",
      joinedAt: new Date().toISOString(),
      user: { id: "user-2", name: "Bob", image: null, email: "bob@example.com" },
    },
  ],
  _count: { members: 2 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockInvites = [
  {
    id: "inv-1",
    token: "tok1",
    cliqueId: "clique-1",
    createdById: "user-1",
    email: "carol@example.com",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: { id: "user-1", name: "Alice" },
  },
]

const defaultProps = {
  cliqueId: "clique-1",
  cliqueName: "Weekend Crew",
  currentUserId: "user-1",
}

describe("CliqueManagementDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.confirm = jest.fn().mockReturnValue(true)
  })

  it("renders the settings trigger button with correct aria-label", () => {
    render(<CliqueManagementDialog {...defaultProps} />)
    expect(
      screen.getByRole("button", { name: /manage weekend crew/i })
    ).toBeInTheDocument()
  })

  it("opens the dialog and loads clique members", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockClique), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))

    const dialog = await screen.findByRole("dialog")
    expect(await within(dialog).findByText("Alice")).toBeInTheDocument()
    expect(within(dialog).getByText("Bob")).toBeInTheDocument()
  })

  it("marks the creator with 'Creator' label", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockClique), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))

    expect(await screen.findByText("Creator")).toBeInTheDocument()
  })

  it("shows a remove button for non-creator members (creator only)", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockClique), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))

    expect(await screen.findByRole("button", { name: /remove bob/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /remove alice/i })).not.toBeInTheDocument()
  })

  it("hides the remove button for non-creator current users", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockClique), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(
      <CliqueManagementDialog
        cliqueId="clique-1"
        cliqueName="Weekend Crew"
        currentUserId="user-2"
      />
    )
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
    await screen.findByText("Alice")

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument()
  })

  it("removes a member and refreshes on success", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockClique), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Member removed" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    global.fetch = mockFetch as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
    await screen.findByText("Bob")

    await user.click(screen.getByRole("button", { name: /remove bob/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/cliques/clique-1/members/user-2",
        { method: "DELETE" }
      )
    })
    expect(mockRefresh).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText("Bob")).not.toBeInTheDocument()
    })
  })

  it("shows an error when member removal fails", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockClique), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
    global.fetch = mockFetch as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
    await screen.findByText("Bob")

    await user.click(screen.getByRole("button", { name: /remove bob/i }))

    expect(await screen.findByText("Forbidden")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
  })

  it("shows an error when clique loading fails", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))

    expect(await screen.findByText("Forbidden")).toBeInTheDocument()
  })

  it("shows a generic error when fetch throws during load", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error("Network")) as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))

    expect(await screen.findByText("Failed to load clique")).toBeInTheDocument()
  })

  describe("Invites tab", () => {
    it("shows the Invites tab only for the creator", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockClique), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      // Non-creator
      render(
        <CliqueManagementDialog
          cliqueId="clique-1"
          cliqueName="Weekend Crew"
          currentUserId="user-2"
        />
      )
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      expect(screen.queryByTestId("tab-invites")).not.toBeInTheDocument()
    })

    it("loads and displays pending invites when Invites tab is clicked", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockInvites), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByTestId("tab-invites"))

      expect(await screen.findByText("carol@example.com")).toBeInTheDocument()
    })

    it("shows empty state when there are no pending invites", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByTestId("tab-invites"))

      expect(await screen.findByText("No pending invites.")).toBeInTheDocument()
    })

    it("revokes an invite and removes it from the list", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockInvites), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: "Invite revoked" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByTestId("tab-invites"))
      await screen.findByText("carol@example.com")

      await user.click(screen.getByRole("button", { name: /revoke/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/cliques/clique-1/invites/inv-1",
          { method: "DELETE" }
        )
      })
      await waitFor(() => {
        expect(screen.queryByText("carol@example.com")).not.toBeInTheDocument()
      })
    })

    it("shows an error when invite loading fails", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByTestId("tab-invites"))

      expect(await screen.findByText("Forbidden")).toBeInTheDocument()
    })

    it("shows a generic error when invite fetch throws", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockRejectedValue(new Error("Network"))
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByTestId("tab-invites"))

      expect(await screen.findByText("Failed to load invites")).toBeInTheDocument()
    })

    it("shows an error when revoke fails", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockInvites), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Invite not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByTestId("tab-invites"))
      await screen.findByText("carol@example.com")

      await user.click(screen.getByRole("button", { name: /revoke/i }))

      expect(await screen.findByText("Invite not found")).toBeInTheDocument()
    })
  })

  describe("Delete clique", () => {
    it("shows a Delete clique button for the creator", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockClique), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      expect(screen.getByRole("button", { name: /delete clique/i })).toBeInTheDocument()
    })

    it("does not show Delete clique for non-creator", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockClique), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      render(
        <CliqueManagementDialog
          cliqueId="clique-1"
          cliqueName="Weekend Crew"
          currentUserId="user-2"
        />
      )
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      expect(screen.queryByRole("button", { name: /delete clique/i })).not.toBeInTheDocument()
    })

    it("deletes the clique after confirmation and refreshes", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: "Clique deleted" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByRole("button", { name: /delete clique/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/cliques/clique-1", {
          method: "DELETE",
        })
      })
      expect(mockRefresh).toHaveBeenCalled()
    })

    it("does not delete when the user cancels the confirmation", async () => {
      const user = userEvent.setup()
      window.confirm = jest.fn().mockReturnValue(false)
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify(mockClique), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByRole("button", { name: /delete clique/i }))

      expect(global.fetch).toHaveBeenCalledTimes(1) // only the initial load
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it("shows an error when deletion fails", async () => {
      const user = userEvent.setup()
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockClique), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          })
        )
      global.fetch = mockFetch as typeof fetch

      render(<CliqueManagementDialog {...defaultProps} />)
      await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
      await screen.findByText("Alice")

      await user.click(screen.getByRole("button", { name: /delete clique/i }))

      expect(await screen.findByText("Forbidden")).toBeInTheDocument()
    })
  })

  it("opens the invite dialog when 'Invite someone' is clicked", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockClique), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(<CliqueManagementDialog {...defaultProps} />)
    await user.click(screen.getByRole("button", { name: /manage weekend crew/i }))
    await screen.findByText("Alice")

    await user.click(screen.getByRole("button", { name: /invite someone/i }))

    // The invite dialog should now be open — its title is distinct from the management dialog
    expect(
      await screen.findByRole("heading", { name: /invite to weekend crew/i })
    ).toBeInTheDocument()
  })
})
