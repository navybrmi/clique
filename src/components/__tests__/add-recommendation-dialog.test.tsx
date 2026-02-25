import '@testing-library/jest-dom';
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
      return Promise.resolve(new Response(JSON.stringify({ user: { id: "test-user-id", name: "Test User", email: "test@example.com" } })) as unknown as Response);
    }
    if (url.includes("/api/categories")) {
      return Promise.resolve(new Response(JSON.stringify([
        { id: "1", name: "MOVIE", displayName: "Movie" },
        { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        { id: "3", name: "FASHION", displayName: "Fashion" },
        { id: "4", name: "HOUSEHOLD", displayName: "Household" },
        { id: "5", name: "OTHER", displayName: "Other" },
      ])) as unknown as Response);
    }
    if (url.includes("/api/movies/search")) {
      return Promise.resolve(new Response(JSON.stringify({
        results: [
          {
            id: 123,
            title: "Inception",
            year: "2010",
            posterPath: "https://image.tmdb.org/t/p/w500/inception.jpg",
            genre: "Action, Sci-Fi",
          },
        ],
      })) as unknown as Response);
    }
    if (url.includes("/api/movies/")) {
      return Promise.resolve(new Response(JSON.stringify({
        title: "Inception",
        director: "Christopher Nolan",
        year: 2010,
        genre: "Action, Sci-Fi",
        duration: "2h 28min",
        posterPath: "https://image.tmdb.org/t/p/w500/inception.jpg",
        imdbLink: "https://www.imdb.com/title/tt1375666/",
      })) as unknown as Response);
    }
    if (url.includes("/api/recommendations") && (init?.method === 'POST' || (init && 'method' in init && (init as RequestInit).method === 'POST'))) {
      return Promise.resolve(new Response(JSON.stringify({ id: "rec-1" })) as unknown as Response);
    }
    if (url.includes("/api/restaurants/search")) {
      return Promise.resolve(new Response(JSON.stringify({
        results: [
          {
            id: "ChIJ_test_place_id",
            name: "Test Pizza Place",
            imageUrl: "https://maps.example.com/photo-search.jpg",
            location: "123 Main St, New York, NY",
            categories: "Italian, Pizza",
            price: "$$",
            rating: 4.5,
            reviewCount: 200,
          },
        ],
      })) as unknown as Response);
    }
    if (url.match(/\/api\/restaurants\/[^/]+$/) && !url.includes("search")) {
      return Promise.resolve(new Response(JSON.stringify({
        id: "ChIJ_test_place_id",
        name: "Test Pizza Place",
        imageUrl: "https://maps.example.com/photo-detail.jpg",
        rating: 4.5,
        reviewCount: 200,
        cuisine: "Italian, Pizza, Pasta",
        location: "123 Main St, New York, NY 10001",
        priceRange: "$$",
        phone: "(212) 555-1234",
        url: "https://testpizzaplace.com",
        hours: "Monday: 11:00 AM - 10:00 PM, Tuesday: 11:00 AM - 10:00 PM",
      })) as unknown as Response);
    }
    if (url.includes("/api/tags") && url.includes("RESTAURANT")) {
      return Promise.resolve(new Response(JSON.stringify({
        categoryName: "RESTAURANT",
        tags: ["Great ambiance", "Excellent service", "Hidden gem"],
        count: 3,
      })) as unknown as Response);
    }
    if (url.includes("/api/tags") && url.includes("MOVIE")) {
      return Promise.resolve(new Response(JSON.stringify({
        categoryName: "MOVIE",
        tags: ["Great cinematography", "Compelling story"],
        count: 2,
      })) as unknown as Response);
    }
    return Promise.resolve(new Response(JSON.stringify({ results: [] })) as unknown as Response);
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
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("")
    expect((screen.getByLabelText(/link/i) as HTMLInputElement).value).toBe("")
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

  it("should handle typeahead and select a movie suggestion", async () => {
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
    if (movieOption) fireEvent.click(movieOption)
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
    // Check that the Name input is populated with the movie title
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("Inception")
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
    if (movieOption) fireEvent.click(movieOption)
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
    try {
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      }, { timeout: 2000 })
    } catch (e) {
      throw e
    }
  })

  it("should show alert if not signed in", async () => {
    // Wrapper to simulate parent logic
    function Wrapper() {
      const [showLoginAlert, setShowLoginAlert] = React.useState(false)
      return (
        <>
          <AddRecommendationDialog
            onSuccess={jest.fn()}
            initialCategoryId="1"
            showLoginAlert={showLoginAlert}
            onBlockedOpen={() => setShowLoginAlert(true)}
          />
          {showLoginAlert && (
            <div>
              You must be signed in to add a recommendation.
            </div>
          )}
        </>
      )
    }
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
    render(<Wrapper />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await waitFor(() => expect(screen.getByText(/must be signed in to add a recommendation/i)).toBeInTheDocument())
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

  it("should populate fields in edit mode", async () => {
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
      expect((screen.getByPlaceholderText(/director/i) as HTMLInputElement).value).toBe("Dir")
      const yearValue = (screen.getByPlaceholderText(/year/i) as HTMLInputElement).value;
      expect(yearValue).toBe("2020");
      expect((screen.getByPlaceholderText(/genre/i) as HTMLInputElement).value).toBe("Drama")
      expect((screen.getByPlaceholderText(/duration/i) as HTMLInputElement).value).toBe("2h")
      expect(screen.getByText(/tag1/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it("should handle restaurant suggestion selection and fetch details", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Select Restaurant category
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Restaurant/i)
      expect(options.length).toBeGreaterThan(0)
    })
    const restaurantOption = within(document.body).queryAllByText(/Restaurant/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    if (restaurantOption) fireEvent.click(restaurantOption)
    // Type in the name input to trigger restaurant search
    const nameInput = screen.getByLabelText(/name/i)
    fireEvent.change(nameInput, { target: { value: "Pizza" } })
    // Wait for suggestion to appear
    const suggestion = await waitFor(() => {
      const btns = within(document.body).queryAllByRole('button', { name: /test pizza place/i })
      if (!btns.length) throw new Error('No suggestion button')
      return btns[0]
    }, { timeout: 2000 })
    fireEvent.click(suggestion)
    // Verify the details API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/restaurants/ChIJ_test_place_id")
      )
    })
    // Verify form fields are populated from the details response
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/cuisine/i) as HTMLInputElement).value).toBe("Italian, Pizza, Pasta")
      expect((screen.getByPlaceholderText(/location/i) as HTMLInputElement).value).toBe("123 Main St, New York, NY 10001")
      expect((screen.getByPlaceholderText(/price range/i) as HTMLInputElement).value).toBe("$$")
      expect((screen.getByPlaceholderText(/hours/i) as HTMLInputElement).value).toBe("Monday: 11:00 AM - 10:00 PM, Tuesday: 11:00 AM - 10:00 PM")
    })
    // Verify name and link are set
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("Test Pizza Place")
    await waitFor(() => {
      expect((screen.getByLabelText(/link/i) as HTMLInputElement).value).toBe("https://testpizzaplace.com")
    })
  })

  it("should fall back to search data when restaurant details API fails", async () => {
    // Override fetch to make restaurant details fail but keep other mocks working
    ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input instanceof Request ? input.url : ''));
      if (url.includes("/api/auth/session")) {
        return Promise.resolve(new Response(JSON.stringify({ user: { id: "test-user-id", name: "Test User", email: "test@example.com" } })) as unknown as Response);
      }
      if (url.includes("/api/categories")) {
        return Promise.resolve(new Response(JSON.stringify([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        ])) as unknown as Response);
      }
      if (url.includes("/api/restaurants/search")) {
        return Promise.resolve(new Response(JSON.stringify({
          results: [
            {
              id: "ChIJ_test_place_id",
              name: "Test Pizza Place",
              imageUrl: "https://maps.example.com/photo-search.jpg",
              location: "123 Main St, New York, NY",
              categories: "Italian, Pizza",
              price: "$$",
            },
          ],
        })) as unknown as Response);
      }
      if (url.match(/\/api\/restaurants\/[^/]+$/) && !url.includes("search")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), { status: 500 }) as unknown as Response);
      }
      if (url.includes("/api/tags")) {
        return Promise.resolve(new Response(JSON.stringify({ tags: [] })) as unknown as Response);
      }
      return Promise.resolve(new Response(JSON.stringify({ results: [] })) as unknown as Response);
    })
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Select Restaurant category
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Restaurant/i)
      expect(options.length).toBeGreaterThan(0)
    })
    const restaurantOption = within(document.body).queryAllByText(/Restaurant/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    if (restaurantOption) fireEvent.click(restaurantOption)
    const nameInput = screen.getByLabelText(/name/i)
    fireEvent.change(nameInput, { target: { value: "Pizza" } })
    const suggestion = await waitFor(() => {
      const btns = within(document.body).queryAllByRole('button', { name: /test pizza place/i })
      if (!btns.length) throw new Error('No suggestion button')
      return btns[0]
    }, { timeout: 2000 })
    fireEvent.click(suggestion)
    // Wait for fetch to complete — should fall back to search result data
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/cuisine/i) as HTMLInputElement).value).toBe("Italian, Pizza")
      expect((screen.getByPlaceholderText(/location/i) as HTMLInputElement).value).toBe("123 Main St, New York, NY")
      expect((screen.getByPlaceholderText(/price range/i) as HTMLInputElement).value).toBe("$$")
    })
  })

  it("should include phoneNumber and placeId in restaurant submission payload", async () => {
    let capturedPayload: any = null
    ;(global.fetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: "user1" } }) })
      }
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { id: "1", name: "MOVIE", displayName: "Movie" },
          { id: "2", name: "RESTAURANT", displayName: "Restaurant" },
        ]) })
      }
      if (url.includes("/api/recommendations") && init?.method === "POST") {
        capturedPayload = JSON.parse(init.body as string)
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "rec-1" }) })
      }
      if (url.includes("/api/tags")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tags: [] }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
    })
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="2" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Restaurant" } })
    // Manually set restaurant data fields including phoneNumber and placeId
    await waitFor(() => expect(screen.getByPlaceholderText(/cuisine/i)).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/cuisine/i), { target: { value: "Italian" } })
    fireEvent.change(screen.getByPlaceholderText(/location/i), { target: { value: "NYC" } })
    // Submit
    const createBtns = screen.getAllByText(/^create$/i)
    const submitBtn = createBtns.find(btn => btn.tagName === 'BUTTON')!
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(capturedPayload).toBeTruthy()
      expect(capturedPayload.restaurantData).toBeDefined()
      expect(capturedPayload.restaurantData).toHaveProperty("phoneNumber")
      expect(capturedPayload.restaurantData).toHaveProperty("placeId")
    })
  })

  it("should show alert if required fields are missing", async () => {
    window.alert = jest.fn()
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Clear the name to trigger required validation
    const nameInput = screen.getByLabelText(/name/i)
    await userEvent.clear(nameInput)
    // Wait for state update
    await waitFor(() => expect(nameInput).toHaveValue(""))
      // Submit the form directly using querySelector
      const form = document.querySelector('form')
      expect(form).toBeTruthy()
      if (form) fireEvent.submit(form)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Entity name and category are required")))
  })

  it("should render all Fashion and Household fields when those categories are selected", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    const combobox = screen.getByRole('combobox')
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Fashion/i)
      expect(options.length).toBeGreaterThan(0)
    })
    const fashionOption = within(document.body).queryAllByText(/Fashion/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    if (fashionOption) fireEvent.click(fashionOption)
    expect(screen.getByPlaceholderText(/brand/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/price/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/size/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/color/i)).toBeInTheDocument()
    // Switch to Household
    fireEvent.click(combobox)
    await waitFor(() => {
      const options = within(document.body).queryAllByText(/Household/i)
      expect(options.length).toBeGreaterThan(0)
    })
    const householdOption = within(document.body).queryAllByText(/Household/i).find(node => node.tagName === 'OPTION' || node.tagName === 'SPAN')
    if (householdOption) fireEvent.click(householdOption)
    expect(screen.getByPlaceholderText(/product type/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/model/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/purchase link/i)).toBeInTheDocument()
  })

  it("should disable all fields except category when no category is selected", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)

    // Category dropdown should be enabled
    const categoryTrigger = screen.getByRole('combobox')
    expect(categoryTrigger).not.toBeDisabled()

    // Entity name input should be disabled
    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toBeDisabled()

    // Tag input and Add button should be disabled
    const tagInput = screen.getByPlaceholderText(/great cinematography/i)
    expect(tagInput).toBeDisabled()
    const addBtn = screen.getByText(/^add$/i)
    expect(addBtn).toBeDisabled()

    // Rating star buttons should be disabled
    const starBtn = screen.getByLabelText(/rate 1 star$/i)
    expect(starBtn).toBeDisabled()

    // Link and Image URL inputs should be disabled
    const linkInput = screen.getByLabelText(/link/i)
    expect(linkInput).toBeDisabled()
    const imageUrlInput = screen.getByLabelText(/image url/i)
    expect(imageUrlInput).toBeDisabled()
  })

  it("should enable all fields after selecting a category", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)

    // Select Movie category
    const categoryTrigger = screen.getByRole('combobox')
    await userEvent.click(categoryTrigger)
    const options = await within(document.body).findAllByRole('option', {}, { timeout: 2000 })
    const movieOption = options.find(opt => /Movie/i.test(opt.textContent || ""))
    expect(movieOption).toBeTruthy()
    await userEvent.click(movieOption as Element)

    // Entity name input should be enabled
    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).not.toBeDisabled()

    // Tag input and Add button should be enabled
    const tagInput = screen.getByPlaceholderText(/great cinematography/i)
    expect(tagInput).not.toBeDisabled()
    const addBtn = screen.getByText(/^add$/i)
    expect(addBtn).not.toBeDisabled()

    // Rating star buttons should be enabled
    const starBtn = screen.getByLabelText(/rate 1 star$/i)
    expect(starBtn).not.toBeDisabled()

    // Link and Image URL inputs should be enabled
    const linkInput = screen.getByLabelText(/link/i)
    expect(linkInput).not.toBeDisabled()
    const imageUrlInput = screen.getByLabelText(/image url/i)
    expect(imageUrlInput).not.toBeDisabled()

    // Category-specific fields (Movie) should be enabled
    expect(screen.getByPlaceholderText(/director/i)).not.toBeDisabled()
    expect(screen.getByPlaceholderText(/year/i)).not.toBeDisabled()
    expect(screen.getByPlaceholderText(/genre/i)).not.toBeDisabled()
    expect(screen.getByPlaceholderText(/duration/i)).not.toBeDisabled()
  })

  it("should show restaurant-specific placeholder when Restaurant category is selected", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Select Restaurant category
    const combobox = screen.getByRole('combobox')
    await userEvent.click(combobox)
    const options = await within(document.body).findAllByRole('option', {}, { timeout: 2000 })
    const restaurantOption = options.find(opt => /Restaurant/i.test(opt.textContent || ""))
    expect(restaurantOption).toBeTruthy()
    await userEvent.click(restaurantOption as Element)
    // Check placeholder changed to restaurant-specific text
    expect(screen.getByPlaceholderText(/great ambiance/i)).toBeInTheDocument()
  })

  it("should fetch and display suggested tags for Restaurant category", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Select Restaurant category
    const combobox = screen.getByRole('combobox')
    await userEvent.click(combobox)
    const options = await within(document.body).findAllByRole('option', {}, { timeout: 2000 })
    const restaurantOption = options.find(opt => /Restaurant/i.test(opt.textContent || ""))
    expect(restaurantOption).toBeTruthy()
    await userEvent.click(restaurantOption as Element)
    // Wait for tags to be fetched and rendered
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tags?categoryName=RESTAURANT")
      )
    })
  })

  it("should handle dialog footer buttons", async () => {
    render(<AddRecommendationDialog onSuccess={jest.fn()} initialCategoryId="1" />)
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    // Cancel button
    fireEvent.click(screen.getByText(/cancel/i))
    // Reopen and submit
    fireEvent.click(screen.getByText(/add recommendation/i))
    await screen.findByLabelText(/category/i)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Test Movie" } })
    const createBtns = screen.getAllByText(/^create$/i)
    fireEvent.click(createBtns.find(btn => btn.tagName === 'BUTTON')!)
    // No error thrown
  })
})
