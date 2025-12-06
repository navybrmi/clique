import { NextRequest } from "next/server"
import { GET } from "../route"

// Mock fetch globally
global.fetch = jest.fn()

describe("GET /api/movies/[id]", () => {
  const mockFetch = global.fetch as jest.Mock

  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-api-key"
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.TMDB_API_KEY
  })

  it("should return movie details for valid ID", async () => {
    // Arrange
    const mockMovieData = {
      title: "Inception",
      release_date: "2010-07-16",
      runtime: 148,
      poster_path: "/poster.jpg",
      overview: "A thief who steals corporate secrets through dream-sharing technology...",
      imdb_id: "tt1375666",
      genres: [
        { id: 28, name: "Action" },
        { id: 878, name: "Science Fiction" },
      ],
      credits: {
        crew: [
          { job: "Director", name: "Christopher Nolan" },
          { job: "Producer", name: "Emma Thomas" },
        ],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    })

    const request = new NextRequest("http://localhost/api/movies/27205")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "27205" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      title: "Inception",
      director: "Christopher Nolan",
      year: 2010,
      genre: "Action, Science Fiction",
      duration: "2h 28min",
      posterPath: "https://image.tmdb.org/t/p/w500/poster.jpg",
      overview: "A thief who steals corporate secrets through dream-sharing technology...",
      imdbLink: "https://www.imdb.com/title/tt1375666/",
    })
  })

  it("should return 500 when API key is not configured", async () => {
    // Arrange
    delete process.env.TMDB_API_KEY
    const request = new NextRequest("http://localhost/api/movies/27205")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "27205" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toHaveProperty("error")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should handle TMDB API errors", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    })

    const request = new NextRequest("http://localhost/api/movies/999999")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "999999" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Failed to fetch movie details" })
    expect(consoleErrorSpy).toHaveBeenCalledWith("TMDB API error:", "Not Found")

    consoleErrorSpy.mockRestore()
  })

  it("should handle movies without director", async () => {
    // Arrange
    const mockMovieData = {
      title: "Unknown Movie",
      release_date: "2020-01-01",
      runtime: 90,
      poster_path: null,
      overview: "A movie without a director",
      imdb_id: null,
      genres: [],
      credits: {
        crew: [],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    })

    const request = new NextRequest("http://localhost/api/movies/12345")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "12345" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.director).toBeNull()
    expect(data.imdbLink).toBeNull()
  })

  it("should format runtime correctly", async () => {
    // Arrange
    const mockMovieData = {
      title: "Short Film",
      release_date: "2020-01-01",
      runtime: 65, // 1h 5min
      poster_path: null,
      overview: "A short film",
      imdb_id: null,
      genres: [],
      credits: {
        crew: [],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    })

    const request = new NextRequest("http://localhost/api/movies/12345")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "12345" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.duration).toBe("1h 5min")
  })

  it("should handle fetch errors gracefully", async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const request = new NextRequest("http://localhost/api/movies/12345")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "12345" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Internal server error" })
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching movie details:", expect.any(Error))

    consoleErrorSpy.mockRestore()
  })
})
