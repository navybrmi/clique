import { NextRequest } from "next/server"
import { POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    entity: {
      update: jest.fn(),
    },
    movie: {
      update: jest.fn(),
    },
    restaurant: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// Mock global fetch
global.fetch = jest.fn()

const mockRequest = (id: string) =>
  new NextRequest(`http://localhost/api/recommendations/${id}/refresh`, { method: "POST" })

const mockMovieRecommendation = {
  userId: "user1",
  entityId: "entity1",
  imageUrl: "https://old-poster.jpg",
  entity: {
    name: "Old Title",
    category: { name: "MOVIE" },
    movie: {
      tmdbId: "27205",
      imdbId: null,
      year: 2008,
      genre: "Action",
      duration: "2h 0m",
      director: null,
      attributes: [],
    },
    restaurant: null,
  },
}

const mockRestaurantRecommendation = {
  userId: "user1",
  entityId: "entity1",
  imageUrl: "https://old-photo.jpg",
  entity: {
    name: "Old Name",
    category: { name: "RESTAURANT" },
    restaurant: {
      placeId: "ChIJplace123",
      cuisine: "Italian",
      location: "Old Address",
      priceRange: "$",
      phoneNumber: null,
      hours: null,
    },
    movie: null,
  },
}

const mockTmdbResponse = {
  title: "Inception",
  release_date: "2010-07-16",
  genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
  runtime: 148,
  imdb_id: "tt1375666",
  poster_path: "/poster.jpg",
}

const mockPlacesResponse = {
  status: "OK",
  result: {
    name: "Joe's Pizza",
    formatted_address: "7 Carmine St, New York, NY 10014",
    types: ["pizza_restaurant", "italian_restaurant", "restaurant", "food", "establishment"],
    price_level: 2,
    formatted_phone_number: "(212) 366-1182",
    opening_hours: {
      weekday_text: [
        "Monday: 10:00 AM – 4:00 AM",
        "Tuesday: 10:00 AM – 4:00 AM",
      ],
    },
    photos: [{ photo_reference: "photo_ref_abc123" }],
  },
}

describe("POST /api/recommendations/[id]/refresh", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Default: transaction executes its callback
    ;(prisma.$transaction as jest.Mock).mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma)
    )
  })

  // --- Auth & ownership ---

  it("returns 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("returns 404 when recommendation not found", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Recommendation not found" })
  })

  it("returns 403 when user is not the owner", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user2" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(mockMovieRecommendation)

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  // --- Category validation ---

  it("returns 400 for unsupported category (e.g. FASHION)", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      ...mockMovieRecommendation,
      entity: {
        ...mockMovieRecommendation.entity,
        category: { name: "FASHION" },
      },
    })

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/only supported for movies and restaurants/i)
  })

  // --- Movie refresh ---

  it("looks up tmdbId by name when missing and proceeds with refresh", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        ...mockMovieRecommendation,
        entity: {
          ...mockMovieRecommendation.entity,
          movie: { ...mockMovieRecommendation.entity.movie, tmdbId: null },
        },
      })
      .mockResolvedValueOnce({
        imageUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
        entity: { name: "Inception", movie: { year: 2010, genre: "Action", duration: "2h 28m", tmdbId: "27205", imdbId: null, director: null, attributes: [] } },
      })
    ;(global.fetch as jest.Mock)
      // First call: TMDB search by name
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 27205, title: "Old Title", release_date: "2008-01-01" }] }),
      })
      // Second call: TMDB movie details
      .mockResolvedValueOnce({ ok: true, json: async () => mockTmdbResponse })
    ;(prisma.movie.update as jest.Mock).mockResolvedValue({})
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updatedFields).toEqual(expect.arrayContaining(["name", "year", "genre", "duration"]))
    // tmdbId should have been saved via movie.update before the transaction
    expect(prisma.movie.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tmdbId: "27205" }) })
    )
  })

  it("prefers year-and-title matched result when looking up tmdbId by name", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        ...mockMovieRecommendation,
        entity: {
          ...mockMovieRecommendation.entity,
          name: "Inception",
          movie: { ...mockMovieRecommendation.entity.movie, tmdbId: null, year: 2010 },
        },
      })
      .mockResolvedValueOnce({
        imageUrl: null,
        entity: { name: "Inception", movie: { year: 2010, genre: "Sci-Fi", duration: null, tmdbId: "27205", imdbId: null, director: null, attributes: [] } },
      })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 99999, title: "Inception", release_date: "2000-01-01" }, // year mismatch
            { id: 27205, title: "Inception", release_date: "2010-07-16" }, // exact match
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTmdbResponse })
    ;(prisma.movie.update as jest.Mock).mockResolvedValue({})
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })

    // Should have used the year+title matched id (27205), not the top result (99999)
    expect(prisma.movie.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tmdbId: "27205" }) })
    )
  })

  it("returns 400 when tmdbId is missing and TMDB search finds no results", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      ...mockMovieRecommendation,
      entity: {
        ...mockMovieRecommendation.entity,
        movie: { ...mockMovieRecommendation.entity.movie, tmdbId: null },
      },
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/could not find this movie on TMDB/i)
  })

  it("returns 502 when TMDB API call fails", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(mockMovieRecommendation)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" })

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toMatch(/TMDB/i)

    consoleErrorSpy.mockRestore()
  })

  it("refreshes movie and returns updated fields", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMovieRecommendation)
      .mockResolvedValueOnce({
        imageUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
        entity: {
          name: "Inception",
          movie: {
            year: 2010,
            genre: "Action, Science Fiction",
            duration: "2h 28m",
            tmdbId: "27205",
            imdbId: "tt1375666",
            director: null,
            attributes: [],
          },
        },
      })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTmdbResponse,
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.movie.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updatedFields).toEqual(
      expect.arrayContaining(["name", "year", "genre", "duration", "imdbId", "imageUrl"])
    )
    expect(data.entity.name).toBe("Inception")
    expect(data.entity.movie.year).toBe(2010)
    expect(data.entity.movie.genre).toBe("Action, Science Fiction")
    expect(data.entity.movie.duration).toBe("2h 28m")
    expect(data.imageUrl).toBe("https://image.tmdb.org/t/p/w500/poster.jpg")
  })

  it("preserves existing movie fields when TMDB returns null values", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMovieRecommendation)
      .mockResolvedValueOnce({
        imageUrl: "https://old-poster.jpg",
        entity: {
          name: "Inception",
          movie: {
            year: null,
            genre: null,
            duration: null,
            tmdbId: "27205",
            imdbId: null,
            director: null,
            attributes: [],
          },
        },
      })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Inception",
        release_date: null,
        genres: [],
        runtime: null,
        imdb_id: null,
        poster_path: null,
      }),
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.movie.update as jest.Mock).mockResolvedValue({})

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Only name was returned by the API
    expect(data.updatedFields).toEqual(["name"])
    expect(data.updatedFields).not.toContain("year")
    expect(data.updatedFields).not.toContain("genre")
    expect(data.updatedFields).not.toContain("duration")
    expect(data.updatedFields).not.toContain("imageUrl")
    // imageUrl not updated — no DB call for recommendation
    expect(prisma.recommendation.update).not.toHaveBeenCalled()
  })

  it("formats movie runtime correctly (hours and minutes)", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMovieRecommendation)
      .mockResolvedValueOnce({ imageUrl: null, entity: { name: "Test", movie: { duration: "2h 28m" } } })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockTmdbResponse, runtime: 148 }),
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.movie.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })

    expect(prisma.movie.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duration: "2h 28m" }),
      })
    )
  })

  it("formats movie runtime correctly (minutes only)", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockMovieRecommendation)
      .mockResolvedValueOnce({ imageUrl: null, entity: { name: "Short Film", movie: { duration: "45m" } } })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockTmdbResponse, runtime: 45 }),
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.movie.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })

    expect(prisma.movie.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duration: "45m" }),
      })
    )
  })

  // --- Restaurant refresh ---

  it("returns 400 when restaurant has no placeId", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      ...mockRestaurantRecommendation,
      entity: {
        ...mockRestaurantRecommendation.entity,
        restaurant: { ...mockRestaurantRecommendation.entity.restaurant, placeId: null },
      },
    })

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/no Google Place ID/i)
  })

  it("returns 502 when Google Places API call fails", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(mockRestaurantRecommendation)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" })

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toMatch(/Google Places/i)

    consoleErrorSpy.mockRestore()
  })

  it("returns 502 when Google Places API returns non-OK status", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(mockRestaurantRecommendation)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "INVALID_REQUEST", result: null }),
    })

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toMatch(/INVALID_REQUEST/i)

    consoleErrorSpy.mockRestore()
  })

  it("refreshes restaurant and returns updated fields", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockRestaurantRecommendation)
      .mockResolvedValueOnce({
        imageUrl: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=photo_ref_abc123&key=undefined`,
        entity: {
          name: "Joe's Pizza",
          restaurant: {
            cuisine: "pizza restaurant, italian restaurant",
            location: "7 Carmine St, New York, NY 10014",
            priceRange: "$$",
            phoneNumber: "(212) 366-1182",
            hours: "Monday: 10:00 AM – 4:00 AM\nTuesday: 10:00 AM – 4:00 AM",
            placeId: "ChIJplace123",
          },
        },
      })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlacesResponse,
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.restaurant.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updatedFields).toEqual(
      expect.arrayContaining(["name", "location", "cuisine", "priceRange", "phoneNumber", "hours", "imageUrl"])
    )
    expect(data.entity.name).toBe("Joe's Pizza")
    expect(data.entity.restaurant.location).toBe("7 Carmine St, New York, NY 10014")
    expect(data.entity.restaurant.priceRange).toBe("$$")
    expect(data.entity.restaurant.phoneNumber).toBe("(212) 366-1182")
  })

  it("filters out generic place types for restaurant cuisine", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockRestaurantRecommendation)
      .mockResolvedValueOnce({ imageUrl: null, entity: { name: "Joe's Pizza", restaurant: { cuisine: "pizza restaurant, italian restaurant" } } })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlacesResponse,
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.restaurant.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })

    expect(prisma.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cuisine: "pizza restaurant, italian restaurant",
        }),
      })
    )
  })

  it("joins weekday_text with newlines for restaurant hours", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockRestaurantRecommendation)
      .mockResolvedValueOnce({ imageUrl: null, entity: { name: "Joe's", restaurant: { hours: "Mon\nTue" } } })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlacesResponse,
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})
    ;(prisma.restaurant.update as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })

    expect(prisma.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hours: "Monday: 10:00 AM – 4:00 AM\nTuesday: 10:00 AM – 4:00 AM",
        }),
      })
    )
  })

  it("preserves existing restaurant fields when Places returns null values", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockRestaurantRecommendation)
      .mockResolvedValueOnce({
        imageUrl: "https://old-photo.jpg",
        entity: { name: "Joe's Pizza", restaurant: { cuisine: "Italian" } },
      })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        result: {
          name: "Joe's Pizza",
          formatted_address: null,
          types: null,
          price_level: null,
          formatted_phone_number: null,
          opening_hours: null,
          photos: null,
        },
      }),
    })
    ;(prisma.entity.update as jest.Mock).mockResolvedValue({})

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updatedFields).toEqual(["name"])
    expect(data.updatedFields).not.toContain("location")
    expect(data.updatedFields).not.toContain("cuisine")
    expect(data.updatedFields).not.toContain("imageUrl")
    expect(prisma.recommendation.update).not.toHaveBeenCalled()
  })

  // --- Database error handling ---

  it("returns 500 when database transaction fails", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(mockMovieRecommendation)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTmdbResponse,
    })
    ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Error("DB connection lost"))

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const response = await POST(mockRequest("rec1"), { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to refresh recommendation" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
