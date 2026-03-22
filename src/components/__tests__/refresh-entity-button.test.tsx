import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RefreshEntityButton } from "../refresh-entity-button"
import { REFRESH_EVENT } from "../refreshable-entity-details"

const mockRecommendation = {
  id: "rec-123",
  userId: "user-123",
}

const mockRouter = {
  refresh: jest.fn(),
  push: jest.fn(),
}

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}))

const sessionResponse = (userId: string | null) =>
  new Response(JSON.stringify(userId ? { user: { id: userId } } : { user: null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

const refreshSuccessResponse = (updatedFields = ["name", "genre"]) =>
  new Response(
    JSON.stringify({
      updatedFields,
      entity: { name: "Inception", movie: { genre: "Action" } },
      imageUrl: "https://example.com/poster.jpg",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )

const refreshErrorResponse = (message = "Failed to refresh") =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  })

describe("RefreshEntityButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- Visibility & access ---

  it("renders a disabled button when user is not logged in", async () => {
    global.fetch = jest.fn().mockResolvedValue(sessionResponse(null)) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled()
    })
  })

  it("renders a disabled button when user is not the owner", async () => {
    global.fetch = jest.fn().mockResolvedValue(sessionResponse("other-user")) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled()
    })
  })

  it("renders an enabled button when user is the owner", async () => {
    global.fetch = jest.fn().mockResolvedValue(sessionResponse("user-123")) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })
  })

  // --- Loading state ---

  it("shows a loading spinner and disables button during refresh", async () => {
    const user = userEvent.setup()
    let resolveRefresh!: (value: Response) => void
    const refreshPromise = new Promise<Response>((res) => { resolveRefresh = res })

    global.fetch = jest.fn()
      .mockResolvedValueOnce(sessionResponse("user-123"))
      .mockReturnValueOnce(refreshPromise) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: /refresh/i }))

    await waitFor(() => {
      expect(screen.getByText(/refreshing/i)).toBeInTheDocument()
      expect(screen.getByRole("button")).toBeDisabled()
    })

    // Resolve the refresh so React doesn't warn about state updates after unmount
    await act(async () => { resolveRefresh(refreshSuccessResponse()) })
  })

  // --- Success ---

  it("dispatches the entity-data-refreshed event with result data on success", async () => {
    const user = userEvent.setup()
    const eventHandler = jest.fn()
    document.addEventListener(REFRESH_EVENT, eventHandler)

    global.fetch = jest.fn()
      .mockResolvedValueOnce(sessionResponse("user-123"))
      .mockResolvedValueOnce(refreshSuccessResponse(["name", "genre"])) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: /^refresh$/i }))

    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalledTimes(1)
      const event = eventHandler.mock.calls[0][0] as CustomEvent
      expect(event.detail).toMatchObject({
        updatedFields: ["name", "genre"],
        entity: expect.objectContaining({ name: "Inception" }),
        imageUrl: "https://example.com/poster.jpg",
      })
    })

    document.removeEventListener(REFRESH_EVENT, eventHandler)
  })

  it("re-enables the button after a successful refresh", async () => {
    const user = userEvent.setup()
    document.addEventListener(REFRESH_EVENT, () => {})

    global.fetch = jest.fn()
      .mockResolvedValueOnce(sessionResponse("user-123"))
      .mockResolvedValueOnce(refreshSuccessResponse()) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: /^refresh$/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^refresh$/i })).not.toBeDisabled()
    })
  })

  // --- Error handling ---

  it("shows an alert with the API error message on failure", async () => {
    const user = userEvent.setup()
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {})

    global.fetch = jest.fn()
      .mockResolvedValueOnce(sessionResponse("user-123"))
      .mockResolvedValueOnce(refreshErrorResponse("No TMDB ID found")) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: /^refresh$/i }))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("No TMDB ID found")
    })

    alertMock.mockRestore()
  })

  it("shows a generic alert on network error", async () => {
    const user = userEvent.setup()
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {})

    global.fetch = jest.fn()
      .mockResolvedValueOnce(sessionResponse("user-123"))
      .mockRejectedValueOnce(new Error("Network error")) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: /^refresh$/i }))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Failed to refresh recommendation")
    })

    alertMock.mockRestore()
  })

  it("re-enables the button after an error", async () => {
    const user = userEvent.setup()
    jest.spyOn(window, "alert").mockImplementation(() => {})

    global.fetch = jest.fn()
      .mockResolvedValueOnce(sessionResponse("user-123"))
      .mockResolvedValueOnce(refreshErrorResponse()) as jest.Mock

    render(<RefreshEntityButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: /^refresh$/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^refresh$/i })).not.toBeDisabled()
    })

    jest.restoreAllMocks()
  })
})
