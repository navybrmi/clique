import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { AddRecommendationDialog } from "../add-recommendation-dialog"
import React from "react"

// Mock fetch for categories and movies
beforeAll(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes("/api/categories")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        ]),
      })
    }
    if (url.includes("/api/movies/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: "Inception",
          director: "Christopher Nolan",
          year: 2010,
          genre: "Action, Sci-Fi",
          duration: "2h 28min",
          posterPath: "https://image.tmdb.org/t/p/w500/inception.jpg",
          imdbLink: "https://www.imdb.com/title/tt1375666/",
        }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
  })
})

afterAll(() => {
  jest.resetAllMocks()
})

describe("AddRecommendationDialog", () => {
  it("should reset the form when dialog is closed and reopened", async () => {
    // Use initialCategoryId to ensure 'Movie' is selected and label is always 'Movie Name'
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)

    // Open dialog
    fireEvent.click(screen.getByText(/add recommendation/i))

    // Wait for category select to appear
    await screen.findByLabelText(/category/i)


    // No need to set the category, it's already set by initialCategoryId


    // Wait for the name input to appear (flexible matcher)
    const nameInput = await screen.findByLabelText(/name/i)
    fireEvent.change(nameInput, { target: { value: "Inception" } })
    fireEvent.change(screen.getByLabelText(/link/i), { target: { value: "https://test.com" } })
    fireEvent.click(screen.getByText(/cancel/i))

    // Reopen dialog
    fireEvent.click(screen.getByText(/add recommendation/i))

    // Wait for form to reappear
    await screen.findByLabelText(/category/i)


    // No need to set the category again, it's already set by initialCategoryId

    // The label for the name input is 'Item Name *' in the DOM
    expect(screen.getByLabelText(/item name/i)).toHaveValue("")
    expect(screen.getByLabelText(/link/i)).toHaveValue("")
  })
})
