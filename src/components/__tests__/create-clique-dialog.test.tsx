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

    expect(screen.getByRole("button", { name: "Create new Clique" })).toHaveClass(
      "w-full",
      "justify-start"
    )

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

  it("shows a generic error when the fetch throws a network error", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error")) as typeof fetch
    jest.spyOn(console, "error").mockImplementation()

    render(<CreateCliqueDialog />)

    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    await user.type(screen.getByLabelText("Clique name"), "My Clique")
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Create new Clique" })
    )

    expect(await screen.findByText("Failed to create clique")).toBeInTheDocument()
    ;(console.error as jest.Mock).mockRestore()
  })

  it("closes the dialog when Cancel is clicked and resets the form", async () => {
    const user = userEvent.setup()

    render(<CreateCliqueDialog />)

    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    await screen.findByRole("dialog")

    await user.type(screen.getByLabelText("Clique name"), "Some Name")
    await user.click(screen.getByRole("button", { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Reopen — form should be reset
    await user.click(screen.getByRole("button", { name: "Create new Clique" }))
    expect((screen.getByLabelText("Clique name") as HTMLInputElement).value).toBe("")
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
