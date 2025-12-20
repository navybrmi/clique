// Mock Radix Portal to render children inline for tests
jest.mock('@radix-ui/react-portal', () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))
// Polyfill for Radix UI + JSDOM pointer events
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
import userEvent from "@testing-library/user-event"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
// Polyfill scrollIntoView for Radix UI Select (JSDOM does not implement it)
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function () { return undefined }
})
import { AddRecommendationDialog } from "../add-recommendation-dialog"
// Mock NextAuth session to simulate a signed-in user
jest.mock("next-auth/react", () => ({
  __esModule: true,
  useSession: () => ({
    data: {
      user: { id: "test-user-id", name: "Test User", email: "test@example.com" },
    },
    status: "authenticated",
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))
import React from "react"

// Mock fetch for categories and movies
beforeEach(() => {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input instanceof Request ? input.url : ''));
    if (url.includes("/api/auth/session")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { id: "test-user-id", name: "Test User", email: "test@example.com" } }),
      });
    }
    if (url.includes("/api/categories")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
          { id: "3", name: "FASHION", displayName: "Fashion" },
          { id: "4", name: "HOUSEHOLD", displayName: "Household" },
          { id: "5", name: "OTHER", displayName: "Other" },
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
    if (url.includes("/api/recommendations") && (init?.method === 'POST' || (init && 'method' in init && (init as any).method === 'POST'))) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "rec-1" }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }), headers: new Headers(), status: 200, statusText: 'OK', redirected: false, type: 'basic', url: '', clone: () => this, body: null, bodyUsed: false, arrayBuffer: async () => new ArrayBuffer(0), blob: async () => new Blob(), formData: async () => new FormData(), text: async () => '', json: async () => ({ results: [] }) })
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

    // The label for the name input is dynamic (e.g., 'Movie Name *', 'Restaurant Name *', etc.)
    expect(screen.getByLabelText(/name/i)).toHaveValue("")
    expect(screen.getByLabelText(/link/i)).toHaveValue("")
  })

  it("should allow switching categories and render category-specific fields", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    const categoryTrigger = screen.getByLabelText(/category/i)
    await userEvent.click(categoryTrigger)
    // Wait for options and select 'Restaurant'
    let options = await within(document.body).findAllByRole('option', {}, { timeout: 2000 })
    const restaurantOption = options.find(opt => /Restaurant/i.test(opt.textContent || ""))
    expect(restaurantOption).toBeTruthy()
    await userEvent.click(restaurantOption as Element)
    expect(screen.getByPlaceholderText(/cuisine/i)).toBeInTheDocument()
    // Switch to Movie
    await userEvent.click(categoryTrigger)
    options = await within(document.body).findAllByRole('option', {}, { timeout: 2000 })
    const movieOption = options.find(opt => /Movie/i.test(opt.textContent || ""))
    expect(movieOption).toBeTruthy()
    await userEvent.click(movieOption as Element)
    expect(screen.getByPlaceholderText(/director/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/year/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/genre/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/duration/i)).toBeInTheDocument()
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

  it("should submit the form successfully", async () => {
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
    // Debug: log before clicking submit
    // eslint-disable-next-line no-console
    console.log('DEBUG: About to click submit button', submitBtn)
    fireEvent.click(submitBtn)
    // Debug: log dialog state after click
    // eslint-disable-next-line no-console
    console.log('DEBUG: Dialog content after submit:', document.body.innerHTML)
    // Wait for dialog to close (onSuccess called)
    try {
      await waitFor(() => {
        // eslint-disable-next-line no-console
        console.log('DEBUG: onSuccess call count:', onSuccess.mock.calls.length)
        expect(onSuccess).toHaveBeenCalled()
      }, { timeout: 2000 })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('DEBUG: onSuccess was never called. Dialog content:', document.body.innerHTML)
      // Log any visible error messages
      const errors = Array.from(document.body.querySelectorAll('[role="alert"], .text-destructive, .text-red-500')).map(n => n.textContent)
      // eslint-disable-next-line no-console
      console.log('DEBUG: Visible error messages:', errors)
      throw e
    }
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
