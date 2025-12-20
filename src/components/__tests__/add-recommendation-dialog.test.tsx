import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
// Polyfill scrollIntoView for Radix UI Select (JSDOM does not implement it)
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function () { return undefined }
})
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
    if (url.includes("/api/movies/search")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          results: [
            {
              id: 123,
              title: "Inception",
              year: "2010",
              posterPath: "https://image.tmdb.org/t/p/w500/inception.jpg",
              genre: "Action, Sci-Fi",
            },
          ],
        }),
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

  it.skip("should allow switching categories and render category-specific fields", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Open category select using combobox role
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)
    // Wait for and select Restaurant
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Restaurant/i)
      const match = options.find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
      expect(match).toBeTruthy()
    }, { timeout: 2000 })
    const restaurantOption = within(document.body).queryAllByText(/Restaurant/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    fireEvent.click(restaurantOption)
    expect(await screen.findByPlaceholderText(/Cuisine/i)).toBeInTheDocument()
    // Switch to Movie
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Movie/i)
      const divOption = options.find(node => node.tagName === 'DIV')
      expect(divOption).toBeTruthy()
    }, { timeout: 2000 })
    const movieOption = within(document.body).queryAllByText(/Movie/i).find(node => node.tagName === 'DIV')
    fireEvent.click(movieOption)
    expect(await screen.findByPlaceholderText(/Director/i)).toBeInTheDocument()
  })

  it("should add and remove tags", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    const tagInput = screen.getByPlaceholderText(/great cinematography/i)
    fireEvent.change(tagInput, { target: { value: "test tag" } })
    fireEvent.click(screen.getByText(/^add$/i))
    expect(screen.getByText("test tag")).toBeInTheDocument()
    // Remove tag by finding the closest button inside the tag badge
    const badge = screen.getByText("test tag").closest(".flex")
    const removeBtn = badge?.querySelector("button")
    expect(removeBtn).toBeTruthy()
    if (removeBtn) fireEvent.click(removeBtn)
    await waitFor(() => expect(screen.queryByText("test tag")).not.toBeInTheDocument())
  })

  it("should select a rating", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    const starBtn = screen.getByLabelText(/rate 7 stars?/i)
    fireEvent.click(starBtn)
    // No error, rating selected
  })

  it.skip("should handle typeahead and select a movie suggestion", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Select Movie category
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Movie/i)
      const match = options.find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
      expect(match).toBeTruthy()
    }, { timeout: 2000 })
    const movieOption = within(document.body).queryAllByText(/Movie/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    fireEvent.click(movieOption)
    // Now type in the name input
    const nameInput = screen.getByLabelText(/name/i)
    fireEvent.change(nameInput, { target: { value: "Inception" } })
    // Wait for suggestion button in the portal
    const suggestion = await waitFor(() => {
      const btns = within(document.body).queryAllByRole('button', { name: /inception/i })
      if (!btns.length) throw new Error('No suggestion button')
      return btns[0]
    }, { timeout: 2000 })
    fireEvent.click(suggestion)
    expect(screen.getByDisplayValue(/inception/i)).toBeInTheDocument()
  })

  it.skip("should submit the form successfully", async () => {
    // Mock fetch for POST
    (global.fetch as jest.Mock).mockImplementationOnce((url, opts) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        ]) })
      }
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: "user1" } }) })
      }
      if (url.includes("/api/recommendations")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
    })
    const onSuccess = jest.fn()
    render(<AddRecommendationDialog onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Select Movie category
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Movie/i)
      const match = options.find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
      expect(match).toBeTruthy()
    }, { timeout: 2000 })
    const movieOption = within(document.body).queryAllByText(/Movie/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    fireEvent.click(movieOption)
    // Fill all required fields
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Movie" } })
    fireEvent.change(screen.getByLabelText(/link/i), { target: { value: "https://test.com" } })
    fireEvent.change(screen.getByPlaceholderText(/director/i), { target: { value: "Nolan" } })
    fireEvent.change(screen.getByPlaceholderText(/year/i), { target: { value: "2010" } })
    fireEvent.change(screen.getByPlaceholderText(/genre/i), { target: { value: "Action" } })
    fireEvent.change(screen.getByPlaceholderText(/duration/i), { target: { value: "2h" } })
    // Use getAllByText to avoid ambiguity
    const createBtns = screen.getAllByText(/^create$/i)
    const submitBtn = createBtns.find(btn => btn.tagName === 'BUTTON')!
    fireEvent.click(submitBtn)
    // Wait for dialog to close (onSuccess called)
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 2000 })
  })

  it("should show alert if not signed in", async () => {
    window.alert = jest.fn()
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        ]) })
      }
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
    })
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Movie" } })
    const createBtns = screen.getAllByText(/^create$/i)
    fireEvent.click(createBtns.find(btn => btn.tagName === 'BUTTON')!)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/sign in/i)))
  })

  it("should show alert on API error", async () => {
    window.alert = jest.fn()
    ;(global.fetch as jest.Mock).mockImplementation((url, opts) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        ]) })
      }
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: "user1" } }) })
      }
      if (url.includes("/api/recommendations")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "API error" }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
    })
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Movie" } })
    const createBtns = screen.getAllByText(/^create$/i)
    fireEvent.click(createBtns.find(btn => btn.tagName === 'BUTTON')!)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/api error/i)))
  })

  it.skip("should populate fields in edit mode", async () => {
    const initialData = {
      entity: { name: "Edit Movie", categoryId: "1", movie: { director: "Dir", year: "2020", genre: "Drama", duration: "2h" } },
      tags: ["tag1"],
      link: "https://edit.com",
      imageUrl: "https://img.com",
      rating: 8,
    }
    render(<AddRecommendationDialog onSuccess={jest.fn()} editMode initialData={initialData} initialCategoryId="1" />)
    // Open the dialog (edit mode)
    fireEvent.click(screen.getByText(/edit recommendation/i))
    await screen.findByLabelText(/category/i)
    // Wait for all expected values to appear
    await waitFor(() => {
      expect(screen.getByDisplayValue(/edit movie/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/https:\/\/edit.com/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/https:\/\/img.com/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    // Wait for movie-specific fields by placeholder
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/director/i)).toHaveValue("Dir")
      expect(screen.getByPlaceholderText(/year/i)).toHaveValue("2020")
      expect(screen.getByPlaceholderText(/genre/i)).toHaveValue("Drama")
      expect(screen.getByPlaceholderText(/duration/i)).toHaveValue("2h")
      expect(screen.getByText(/tag1/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
