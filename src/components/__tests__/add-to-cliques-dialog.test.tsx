import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react"

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"

describe("AddToCliquesDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("loads cliques on open and adds the recommendation to all selected cliques", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "clique-1",
              name: "Weekend Crew",
              _count: { members: 3 },
            },
            {
              id: "clique-2",
              name: "Movie Night",
              _count: { members: 5 },
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "Recommendation added to clique" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      )
    global.fetch = mockFetch as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    const dialog = await screen.findByRole("dialog")

    expect(await within(dialog).findByText("Weekend Crew")).toBeInTheDocument()
    expect(within(dialog).getByText("Movie Night")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: /select all/i }))
    expect(
      within(dialog).getByRole("checkbox", { name: /weekend crew/i })
    ).toBeChecked()
    expect(
      within(dialog).getByRole("checkbox", { name: /movie night/i })
    ).toBeChecked()

    await user.click(
      within(dialog).getByRole("button", { name: /add to selected cliques/i })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/cliques/clique-1/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: "rec-1" }),
      })
      expect(global.fetch).toHaveBeenCalledWith("/api/cliques/clique-2/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: "rec-1" }),
      })
    })
    expect(await screen.findByText("Added to 2 cliques.")).toBeInTheDocument()
  })

  it("shows an empty-state message when the user has no cliques", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    const dialog = await screen.findByRole("dialog")

    expect(
      within(dialog).getByText("You aren't part of any cliques yet. Create one from the sidebar first.")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: /add to selected cliques/i })
    ).toBeDisabled()
  })

  it("shows an inline error when clique loading fails", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    ) as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))

    expect(await screen.findByText("Unauthorized")).toBeInTheDocument()
  })

  it("shows a generic error when clique loading throws a network error", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error")) as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))

    expect(await screen.findByText("Failed to load your cliques")).toBeInTheDocument()
  })

  it("shows combined success message when some cliques return 409 and some succeed", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "clique-1", name: "Weekend Crew", _count: { members: 3 } },
            { id: "clique-2", name: "Movie Night", _count: { members: 5 } },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      // clique-1 → 201 (success)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "added" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      )
      // clique-2 → 409 (already saved)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "already in clique" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        })
      )
    global.fetch = mockFetch as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    const dialog = await screen.findByRole("dialog")
    await screen.findByText("Weekend Crew")

    await user.click(within(dialog).getByRole("button", { name: /select all/i }))
    await user.click(within(dialog).getByRole("button", { name: /add to selected cliques/i }))

    expect(await screen.findByText("Added to 1 clique. Already saved in 1 clique.")).toBeInTheDocument()
  })

  it("shows an error when a submit call fails with a non-409 status", async () => {
    const user = userEvent.setup()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "clique-1", name: "Weekend Crew", _count: { members: 3 } }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
    global.fetch = mockFetch as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    await screen.findByText("Weekend Crew")

    const dialog = screen.getByRole("dialog")
    await user.click(within(dialog).getByRole("checkbox", { name: /weekend crew/i }))
    await user.click(within(dialog).getByRole("button", { name: /add to selected cliques/i }))

    expect(await screen.findByText("Forbidden")).toBeInTheDocument()
  })

  it("toggles individual clique selection on and off", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ id: "clique-1", name: "Weekend Crew", _count: { members: 3 } }]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    const dialog = await screen.findByRole("dialog")
    await screen.findByText("Weekend Crew")

    const checkbox = within(dialog).getByRole("checkbox", { name: /weekend crew/i })

    // Check it
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    // Uncheck it
    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it("selects all then clears all via the toggle button", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: "clique-1", name: "Weekend Crew", _count: { members: 3 } },
          { id: "clique-2", name: "Movie Night", _count: { members: 5 } },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    const dialog = await screen.findByRole("dialog")
    await screen.findByText("Weekend Crew")

    // Select all
    await user.click(within(dialog).getByRole("button", { name: /select all/i }))
    expect(within(dialog).getByRole("checkbox", { name: /weekend crew/i })).toBeChecked()
    expect(within(dialog).getByRole("checkbox", { name: /movie night/i })).toBeChecked()

    // Clear all — button should now say "Clear all"
    await user.click(within(dialog).getByRole("button", { name: /clear all/i }))
    expect(within(dialog).getByRole("checkbox", { name: /weekend crew/i })).not.toBeChecked()
    expect(within(dialog).getByRole("checkbox", { name: /movie night/i })).not.toBeChecked()
  })

  it("closes the dialog and resets state when Cancel is clicked", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ id: "clique-1", name: "Weekend Crew", _count: { members: 3 } }]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    await screen.findByRole("dialog")

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("calls onSuccess after a successful submit", async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const onSuccess = jest.fn()
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "clique-1", name: "Weekend Crew", _count: { members: 3 } }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "added" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      )
    global.fetch = mockFetch as typeof fetch

    render(
      <AddToCliquesDialog
        recommendationId="rec-1"
        recommendationName="Inception"
        onSuccess={onSuccess}
      />
    )

    await user.click(screen.getByRole("button", { name: /add to clique/i }))
    const dialog = await screen.findByRole("dialog")
    await screen.findByText("Weekend Crew")

    await user.click(within(dialog).getByRole("checkbox", { name: /weekend crew/i }))
    await user.click(within(dialog).getByRole("button", { name: /add to selected cliques/i }))

    // Success message appears immediately; onSuccess fires after the 1.5s auto-close delay
    expect(await screen.findByText("Added to 1 clique.")).toBeInTheDocument()
    jest.advanceTimersByTime(1500)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })

    jest.useRealTimers()
  })

  describe("icon variant", () => {
    it("renders an icon-only button with the correct aria-label", () => {
      global.fetch = jest.fn() as typeof fetch
      render(
        <AddToCliquesDialog
          recommendationId="rec-1"
          recommendationName="Inception"
          variant="icon"
        />
      )

      const trigger = screen.getByRole("button", { name: /add to your clique/i })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute("aria-label", "Add to your clique(s)")
      expect(screen.queryByText("Add to Clique")).not.toBeInTheDocument()
    })

    it("opens the dialog when the icon button is clicked", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      render(
        <AddToCliquesDialog
          recommendationId="rec-1"
          recommendationName="Inception"
          variant="icon"
        />
      )

      await user.click(screen.getByRole("button", { name: /add to your clique/i }))
      expect(await screen.findByRole("dialog")).toBeInTheDocument()
    })

    it("clears the suppress timeout when dialog is reopened before 400ms elapses", async () => {
      jest.useFakeTimers()
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      render(
        <AddToCliquesDialog
          recommendationId="rec-1"
          recommendationName="Inception"
          variant="icon"
        />
      )

      const trigger = screen.getByRole("button", { name: /add to your clique/i })

      // Open dialog
      await user.click(trigger)
      await screen.findByRole("dialog")

      // Close dialog — starts the 400ms suppress timeout
      await user.keyboard("{Escape}")
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

      // Reopen within 400ms — should clear the pending timeout
      await user.click(trigger)
      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(await screen.findByRole("dialog")).toBeInTheDocument()

      clearTimeoutSpy.mockRestore()
      jest.useRealTimers()
    })

    it("can be reopened after close without errors", async () => {
      const user = userEvent.setup()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      ) as typeof fetch

      render(
        <AddToCliquesDialog
          recommendationId="rec-1"
          recommendationName="Inception"
          variant="icon"
        />
      )

      const trigger = screen.getByRole("button", { name: /add to your clique/i })

      await user.click(trigger)
      await screen.findByRole("dialog")
      await user.keyboard("{Escape}")
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

      // Reopen after close
      await user.click(trigger)
      expect(await screen.findByRole("dialog")).toBeInTheDocument()
    })
  })
})
