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
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

import { CreateCliqueDialog } from "@/components/create-clique-dialog"

describe("CreateCliqueDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders a name input and submit button", async () => {
    const user = userEvent.setup()
    render(<CreateCliqueDialog />)

    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    const dialog = screen.getByRole("dialog")

    expect(screen.getByLabelText("Clique name")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Create new Clique" })
    ).toBeDisabled()
  })

  it("enables submit when the name is non-empty and posts the correct body", async () => {
    const user = userEvent.setup()
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "clique-1", name: "Weekend Crew" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    )
    global.fetch = mockFetch as typeof fetch

    render(<CreateCliqueDialog />)

    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    await user.type(screen.getByLabelText("Clique name"), "Weekend Crew")
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create new Clique",
      })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/cliques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Weekend Crew" }),
      })
    })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("shows the API error message for a 409 response", async () => {
    const user = userEvent.setup()
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "You can belong to a maximum of 10 cliques" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      )
    )
    global.fetch = mockFetch as typeof fetch

    render(<CreateCliqueDialog />)

    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    await user.type(screen.getByLabelText("Clique name"), "Overflow")
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create new Clique",
      })
    )

    expect(
      await screen.findByText("You can belong to a maximum of 10 cliques")
    ).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("closes and notifies the parent on success", async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "clique-1", name: "Weekend Crew" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    )
    global.fetch = mockFetch as typeof fetch

    render(<CreateCliqueDialog onSuccess={onSuccess} />)

    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    await user.type(screen.getByLabelText("Clique name"), "Weekend Crew")
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create new Clique",
      })
    )

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        id: "clique-1",
        name: "Weekend Crew",
      })
    })
    await waitFor(() => {
      expect(screen.queryByLabelText("Clique name")).not.toBeInTheDocument()
    })
  })
})
