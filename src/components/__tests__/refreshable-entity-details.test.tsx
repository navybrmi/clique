import React from "react"
import { render, screen, act } from "@testing-library/react"
import { RefreshableEntityDetails, REFRESH_EVENT } from "../refreshable-entity-details"
import type { RefreshResult } from "../refresh-entity-button"

const movieEntity = {
  name: "Inception",
  movie: {
    year: 2010,
    genre: "Sci-Fi",
    duration: "148 min",
    director: "Christopher Nolan",
  },
}

const restaurantEntity = {
  name: "The Fancy Place",
  restaurant: {
    cuisine: "Italian",
    location: "123 Main St",
    priceRange: "$$$",
    hours: "Mon-Fri: 11am-10pm",
    phoneNumber: "555-1234",
  },
}

function dispatchRefreshEvent(result: RefreshResult) {
  const event = new CustomEvent(REFRESH_EVENT, { detail: result })
  document.dispatchEvent(event)
}

describe("RefreshableEntityDetails", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  // --- Initial rendering ---

  it("renders the entity name", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inception")
  })

  it("renders movie fields", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    expect(screen.getByText("Sci-Fi")).toBeInTheDocument()
    expect(screen.getByText("148 min")).toBeInTheDocument()
    expect(screen.getByText("Christopher Nolan")).toBeInTheDocument()
    expect(screen.getByText("2010")).toBeInTheDocument()
  })

  it("renders restaurant fields", () => {
    render(<RefreshableEntityDetails initialEntity={restaurantEntity} />)
    expect(screen.getByText("Italian")).toBeInTheDocument()
    expect(screen.getByText("123 Main St")).toBeInTheDocument()
    expect(screen.getByText("$$$")).toBeInTheDocument()
    expect(screen.getByText("Mon-Fri: 11am-10pm")).toBeInTheDocument()
    expect(screen.getByText("555-1234")).toBeInTheDocument()
  })

  it("renders the hero image when initialImageUrl is provided", () => {
    render(
      <RefreshableEntityDetails
        initialEntity={movieEntity}
        initialImageUrl="https://example.com/poster.jpg"
      />
    )
    const images = screen.getAllByRole("img")
    const mainImage = images.find((img) => img.getAttribute("alt") === "Inception")
    expect(mainImage).toBeInTheDocument()
  })

  it("does not render a hero image when initialImageUrl is absent", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("renders the website link for restaurants when link is provided", () => {
    render(
      <RefreshableEntityDetails
        initialEntity={restaurantEntity}
        link="https://example.com"
      />
    )
    const link = screen.getByRole("link", { name: /https:\/\/example\.com/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "https://example.com")
  })

  // --- In-place updates via custom DOM event ---

  it("updates the entity name when the refresh event is dispatched", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inception")

    act(() => {
      dispatchRefreshEvent({
        updatedFields: ["name"],
        entity: { name: "Interstellar", movie: {} },
        imageUrl: null,
      })
    })

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Interstellar")
  })

  it("updates movie fields when the refresh event is dispatched", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)

    act(() => {
      dispatchRefreshEvent({
        updatedFields: ["genre", "year"],
        entity: {
          name: "Inception",
          movie: { genre: "Thriller", year: 2011 },
        },
        imageUrl: null,
      })
    })

    expect(screen.getByText("Thriller")).toBeInTheDocument()
    expect(screen.getByText("2011")).toBeInTheDocument()
  })

  it("updates restaurant fields when the refresh event is dispatched", () => {
    render(<RefreshableEntityDetails initialEntity={restaurantEntity} />)

    act(() => {
      dispatchRefreshEvent({
        updatedFields: ["cuisine", "location"],
        entity: {
          name: "The Fancy Place",
          restaurant: { cuisine: "French", location: "456 Oak Ave" },
        },
        imageUrl: null,
      })
    })

    expect(screen.getByText("French")).toBeInTheDocument()
    expect(screen.getByText("456 Oak Ave")).toBeInTheDocument()
  })

  it("updates the hero image when imageUrl is in the refresh result", () => {
    render(
      <RefreshableEntityDetails
        initialEntity={movieEntity}
        initialImageUrl="https://example.com/old.jpg"
      />
    )

    act(() => {
      dispatchRefreshEvent({
        updatedFields: [],
        entity: { name: "Inception", movie: {} },
        imageUrl: "https://example.com/new.jpg",
      })
    })

    const mainImage = screen
      .getAllByRole("img")
      .find((img) => img.getAttribute("alt") === "Inception")
    expect(mainImage).toHaveAttribute("src", expect.stringContaining("new.jpg"))
  })

  it("preserves existing fields not included in the refresh result", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)

    act(() => {
      dispatchRefreshEvent({
        updatedFields: ["genre"],
        entity: { name: "Inception", movie: { genre: "Thriller" } },
        imageUrl: null,
      })
    })

    // director was not in the refresh — should still be shown
    expect(screen.getByText("Christopher Nolan")).toBeInTheDocument()
  })

  // --- Highlight animation ---

  it("applies highlight class to updated fields immediately after refresh", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)

    act(() => {
      dispatchRefreshEvent({
        updatedFields: ["genre"],
        entity: { name: "Inception", movie: { genre: "Action" } },
        imageUrl: null,
      })
    })

    // genre text is inside <p> → inner <div> → outer highlighted <div>
    const genreValue = screen.getByText("Action")
    const highlightedContainer = genreValue.parentElement?.parentElement
    expect(highlightedContainer).toHaveClass("bg-green-50")
  })

  it("removes highlight class after 1200ms", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)

    act(() => {
      dispatchRefreshEvent({
        updatedFields: ["genre"],
        entity: { name: "Inception", movie: { genre: "Action" } },
        imageUrl: null,
      })
    })

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    const genreValue = screen.getByText("Action")
    const highlightedContainer = genreValue.parentElement?.parentElement
    expect(highlightedContainer).not.toHaveClass("bg-green-50")
  })

  // --- children slot ---

  it("renders children when provided", () => {
    render(
      <RefreshableEntityDetails initialEntity={movieEntity}>
        <span data-testid="slot">metadata slot</span>
      </RefreshableEntityDetails>
    )
    expect(screen.getByTestId("slot")).toBeInTheDocument()
    expect(screen.getByTestId("slot")).toHaveTextContent("metadata slot")
  })

  it("renders children after the entity name", () => {
    render(
      <RefreshableEntityDetails initialEntity={movieEntity}>
        <span data-testid="slot">metadata slot</span>
      </RefreshableEntityDetails>
    )
    const heading = screen.getByRole("heading", { level: 1 })
    const slot = screen.getByTestId("slot")
    // heading should appear before slot in DOM order
    expect(
      heading.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("renders children before the detail card content", () => {
    render(
      <RefreshableEntityDetails initialEntity={movieEntity}>
        <span data-testid="slot">metadata slot</span>
      </RefreshableEntityDetails>
    )
    const slot = screen.getByTestId("slot")
    const genreLabel = screen.getByText("Genre")
    // slot should appear before the detail card content in DOM order
    expect(
      slot.compareDocumentPosition(genreLabel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("renders correctly with no children provided", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inception")
    expect(screen.getByText("Sci-Fi")).toBeInTheDocument()
  })

  // --- afterImage slot ---

  it("renders afterImage content when provided", () => {
    render(
      <RefreshableEntityDetails
        initialEntity={movieEntity}
        afterImage={<span data-testid="after-image-slot">submitter info</span>}
      />
    )
    expect(screen.getByTestId("after-image-slot")).toBeInTheDocument()
    expect(screen.getByTestId("after-image-slot")).toHaveTextContent("submitter info")
  })

  it("does not render extra content when afterImage is omitted", () => {
    render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    expect(screen.queryByTestId("after-image-slot")).not.toBeInTheDocument()
  })

  it("renders afterImage content after the hero image and after the entity name (right side of flex row)", () => {
    render(
      <RefreshableEntityDetails
        initialEntity={movieEntity}
        initialImageUrl="https://example.com/poster.jpg"
        afterImage={<span data-testid="after-image-slot">submitter info</span>}
      />
    )
    const images = screen.getAllByRole("img")
    const mainImage = images.find((img) => img.getAttribute("alt") === "Inception")!
    const afterImageContent = screen.getByTestId("after-image-slot")
    const heading = screen.getByRole("heading", { level: 1 })

    // afterImage appears after the hero image in DOM order
    expect(
      mainImage.compareDocumentPosition(afterImageContent) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    // afterImage appears after the h1 in DOM order (right side of the flex row)
    expect(
      heading.compareDocumentPosition(afterImageContent) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  // --- Event listener cleanup ---

  it("removes the event listener on unmount", () => {
    const removeSpy = jest.spyOn(document, "removeEventListener")
    const { unmount } = render(<RefreshableEntityDetails initialEntity={movieEntity} />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith(REFRESH_EVENT, expect.any(Function))
    removeSpy.mockRestore()
  })
})
