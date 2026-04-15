import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor, within } from "@testing-library/react"

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"

describe("AddToCliquesDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
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
    expect(window.alert).toHaveBeenCalledWith("Added to 2 cliques.")
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
})
