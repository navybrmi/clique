import { NextRequest } from "next/server"
import { GET } from "../route"

// Mock fetch globally
global.fetch = jest.fn()

describe("GET /api/movies/search", () => {
  const mockFetch = global.fetch as jest.Mock

  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-api-key"
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.TMDB_API_KEY
  })

  it("should return empty results when query is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/movies/search")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ results: [] })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should return empty results when query is empty", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/movies/search?query=")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ results: [] })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should return empty results when API key is not configured", async () => {
    // Arrange - temporarily remove API key and reload module
    const originalApiKey = process.env.TMDB_API_KEY
    delete process.env.TMDB_API_KEY
    
    // Reset modules to force re-import with missing env var
    jest.resetModules()
    const { GET: GetWithoutKey } = await import("../route")
    
    const request = new NextRequest("http://localhost/api/movies/search?query=inception")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GetWithoutKey(request)
    const data = await response.json()

    // Assert - should return 500 with error when API key is missing
    expect(response.status).toBe(500)
    expect(data).toEqual({ results: [], error: "API key not configured" })
    expect(consoleErrorSpy).toHaveBeenCalledWith("[TMDB] TMDB_API_KEY is not configured")

    consoleErrorSpy.mockRestore()
    
    // Restore original API key
    process.env.TMDB_API_KEY = originalApiKey
  })

  it("should search movies and return formatted results", async () => {
    // Arrange
    const mockMoviesResponse = {
      results: [
        {
          id: 1,
          title: "Inception",
          release_date: "2010-07-16",
          poster_path: "/poster1.jpg",
          overview: "A thief who steals corporate secrets...",
          genre_ids: [28, 878],
        },
        {
          id: 2,
          title: "The Matrix",
          release_date: "1999-03-31",
          poster_path: "/poster2.jpg",
          overview: "A computer hacker learns...",
          genre_ids: [28, 878],
        },
      ],
    }

    const mockGenresResponse = {
      genres: [
        { id: 28, name: "Action" },
        { id: 878, name: "Science Fiction" },
      ],
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoviesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenresResponse,
      })

    const request = new NextRequest("http://localhost/api/movies/search?query=inception")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.results[0]).toEqual({
      id: 1,
      title: "Inception",
      year: 2010,
      posterPath: "https://image.tmdb.org/t/p/w500/poster1.jpg",
      overview: "A thief who steals corporate secrets...",
      genre: "Action, Science Fiction",
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("should return empty results when TMDB API fails", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    })

    const request = new NextRequest("http://localhost/api/movies/search?query=test")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.results).toEqual([])
    expect(data.error).toContain("TMDB API error")
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
      1,
      '[TMDB] Search API error for query "%s": %d %s',
      "test",
      500,
      "Internal Server Error"
    )
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
      2,
      "[TMDB] Error details:",
      "Server error"
    )

    consoleErrorSpy.mockRestore()
  })

  it("should limit results to top 5 movies", async () => {
    // Arrange
    const mockMoviesResponse = {
      results: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        release_date: "2020-01-01",
        poster_path: `/poster${i + 1}.jpg`,
        overview: `Overview ${i + 1}`,
        genre_ids: [28],
      })),
    }

    const mockGenresResponse = {
      genres: [{ id: 28, name: "Action" }],
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoviesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenresResponse,
      })

    const request = new NextRequest("http://localhost/api/movies/search?query=movie")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(5)
  })

  it("should handle movies without release date or poster", async () => {
    // Arrange
    const mockMoviesResponse = {
      results: [
        {
          id: 1,
          title: "Unknown Movie",
          release_date: null,
          poster_path: null,
          overview: "No date or poster",
          genre_ids: [],
        },
      ],
    }

    const mockGenresResponse = {
      genres: [],
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoviesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenresResponse,
      })

    const request = new NextRequest("http://localhost/api/movies/search?query=unknown")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results[0]).toEqual({
      id: 1,
      title: "Unknown Movie",
      year: null,
      posterPath: null,
      overview: "No date or poster",
      genre: "",
    })
  })

  it("should handle fetch errors gracefully", async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const request = new NextRequest("http://localhost/api/movies/search?query=test")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.results).toEqual([])
    expect(data.error).toBe("Unexpected error searching movies")
    expect(consoleErrorSpy).toHaveBeenCalledWith("[TMDB] Error searching movies:", expect.any(Error))

    consoleErrorSpy.mockRestore()
  })
})
