import { NextRequest } from "next/server"
import { GET } from "../route"

// Mock fetch globally
global.fetch = jest.fn()

describe("GET /api/restaurants/search", () => {
  const mockFetch = global.fetch as jest.Mock

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-google-api-key"
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.GOOGLE_PLACES_API_KEY
  })

  it("should return 400 when query is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/restaurants/search")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Query parameter is required" })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should return 500 when API key is not configured", async () => {
    // Arrange
    delete process.env.GOOGLE_PLACES_API_KEY
    const request = new NextRequest("http://localhost/api/restaurants/search?query=pizza")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Google Places API key not configured" })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should search restaurants and return formatted results", async () => {
    // Arrange
    const mockPlacesData = {
      status: "OK",
      results: [
        {
          place_id: "place1",
          name: "Pizza Palace",
          formatted_address: "123 Main St, City, ST 12345",
          rating: 4.5,
          user_ratings_total: 100,
          price_level: 2,
          types: ["restaurant", "pizza", "italian_restaurant", "point_of_interest"],
          photos: [{ photo_reference: "photo1" }],
        },
        {
          place_id: "place2",
          name: "Pasta House",
          formatted_address: "456 Oak Ave, City, ST 12345",
          rating: 4.2,
          user_ratings_total: 75,
          price_level: 3,
          types: ["restaurant", "italian_restaurant"],
          photos: [{ photo_reference: "photo2" }],
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=pizza")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.results[0]).toEqual({
      id: "place1",
      name: "Pizza Palace",
      imageUrl: "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=photo1&key=test-google-api-key",
      location: "123 Main St, City, ST 12345",
      categories: "pizza, italian restaurant",
      price: "$$",
      rating: 4.5,
      reviewCount: 100,
      phone: "",
    })
  })

  it("should include location in search query when provided", async () => {
    // Arrange
    const mockPlacesData = {
      status: "OK",
      results: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=pizza&location=New%20York")

    // Act
    await GET(request)

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("pizza%20restaurant%20in%20New%20York")
    )
  })

  it("should limit results to 5 restaurants", async () => {
    // Arrange
    const mockPlacesData = {
      status: "OK",
      results: Array.from({ length: 10 }, (_, i) => ({
        place_id: `place${i + 1}`,
        name: `Restaurant ${i + 1}`,
        formatted_address: `Address ${i + 1}`,
        rating: 4.0,
        user_ratings_total: 50,
        price_level: 2,
        types: ["restaurant"],
        photos: [],
      })),
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=food")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(5)
  })

  it("should handle ZERO_RESULTS status", async () => {
    // Arrange
    const mockPlacesData = {
      status: "ZERO_RESULTS",
      results: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=nonexistent")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results).toEqual([])
  })

  it("should handle API errors with non-OK status", async () => {
    // Arrange
    const mockPlacesData = {
      status: "REQUEST_DENIED",
      results: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=pizza")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to search restaurants" })

    consoleErrorSpy.mockRestore()
  })

  it("should handle network errors", async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const request = new NextRequest("http://localhost/api/restaurants/search?query=pizza")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to search restaurants" })
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error searching restaurants:", expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it("should filter out meal_delivery and meal_takeaway from categories", async () => {
    // Arrange
    const mockPlacesData = {
      status: "OK",
      results: [
        {
          place_id: "place1",
          name: "Delivery Place",
          formatted_address: "123 Street",
          types: ["restaurant", "food", "meal_delivery", "meal_takeaway", "point_of_interest", "establishment"],
          photos: [],
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=delivery")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results[0].categories).toBe("")
  })

  it("should handle restaurants without photos or ratings", async () => {
    // Arrange
    const mockPlacesData = {
      status: "OK",
      results: [
        {
          place_id: "place1",
          name: "New Restaurant",
          formatted_address: "123 Street",
          types: ["restaurant"],
        },
      ],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlacesData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/search?query=new")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.results[0]).toEqual({
      id: "place1",
      name: "New Restaurant",
      imageUrl: "",
      location: "123 Street",
      categories: "",
      price: "",
      rating: 0,
      reviewCount: 0,
      phone: "",
    })
  })
})
