import { NextRequest } from "next/server"
import { GET } from "../route"

// Mock fetch globally
global.fetch = jest.fn()

describe("GET /api/restaurants/[id]", () => {
  const mockFetch = global.fetch as jest.Mock

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-google-api-key"
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.GOOGLE_PLACES_API_KEY
  })

  it("should return restaurant details for valid ID", async () => {
    // Arrange
    const mockPlaceData = {
      status: "OK",
      result: {
        name: "Pizza Palace",
        formatted_address: "123 Main St, City, ST 12345",
        rating: 4.5,
        user_ratings_total: 200,
        price_level: 2,
        formatted_phone_number: "(555) 123-4567",
        website: "https://pizzapalace.com",
        types: ["restaurant", "pizza", "italian_restaurant", "point_of_interest"],
        photos: [{ photo_reference: "photo123" }],
        opening_hours: {
          weekday_text: [
            "Monday: 11:00 AM – 10:00 PM",
            "Tuesday: 11:00 AM – 10:00 PM",
            "Wednesday: 11:00 AM – 10:00 PM",
            "Thursday: 11:00 AM – 10:00 PM",
            "Friday: 11:00 AM – 11:00 PM",
            "Saturday: 11:00 AM – 11:00 PM",
            "Sunday: 12:00 PM – 9:00 PM",
          ],
        },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlaceData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/place123")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "place123" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      id: "place123",
      name: "Pizza Palace",
      imageUrl: "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=photo123&key=test-google-api-key",
      rating: 4.5,
      reviewCount: 200,
      cuisine: "pizza, italian restaurant",
      location: "123 Main St, City, ST 12345",
      priceRange: "$$",
      phone: "(555) 123-4567",
      url: "https://pizzapalace.com",
      hours: "Monday: 11:00 AM – 10:00 PM, Tuesday: 11:00 AM – 10:00 PM, Wednesday: 11:00 AM – 10:00 PM, Thursday: 11:00 AM – 10:00 PM, Friday: 11:00 AM – 11:00 PM, Saturday: 11:00 AM – 11:00 PM, Sunday: 12:00 PM – 9:00 PM",
    })
  })

  it("should return 500 when API key is not configured", async () => {
    // Arrange
    delete process.env.GOOGLE_PLACES_API_KEY
    const request = new NextRequest("http://localhost/api/restaurants/place123")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "place123" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Google Places API key not configured" })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should handle API errors", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const request = new NextRequest("http://localhost/api/restaurants/invalid")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "invalid" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to fetch restaurant details" })

    consoleErrorSpy.mockRestore()
  })

  it("should handle non-OK API status", async () => {
    // Arrange
    const mockPlaceData = {
      status: "NOT_FOUND",
      result: {},
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlaceData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/notfound")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "notfound" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to fetch restaurant details" })

    consoleErrorSpy.mockRestore()
  })

  it("should handle restaurants with minimal data", async () => {
    // Arrange
    const mockPlaceData = {
      status: "OK",
      result: {
        name: "Simple Restaurant",
        types: ["restaurant"],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlaceData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/simple")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "simple" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      id: "simple",
      name: "Simple Restaurant",
      imageUrl: "",
      rating: 0,
      reviewCount: 0,
      cuisine: "",
      location: "",
      priceRange: null,
      phone: "",
      url: "",
      hours: null,
    })
  })

  it("should filter out common types from cuisine", async () => {
    // Arrange
    const mockPlaceData = {
      status: "OK",
      result: {
        name: "Test Restaurant",
        types: ["restaurant", "food", "point_of_interest", "establishment", "italian_restaurant", "pizza"],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlaceData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/test")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "test" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.cuisine).toBe("italian restaurant, pizza")
  })

  it("should limit cuisine types to 3", async () => {
    // Arrange
    const mockPlaceData = {
      status: "OK",
      result: {
        name: "Multi Cuisine",
        types: ["restaurant", "italian", "mexican", "chinese", "japanese", "thai"],
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlaceData,
    })

    const request = new NextRequest("http://localhost/api/restaurants/multi")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "multi" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    const cuisineCount = data.cuisine.split(", ").length
    expect(cuisineCount).toBeLessThanOrEqual(3)
  })

  it("should handle network errors", async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const request = new NextRequest("http://localhost/api/restaurants/error")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "error" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to fetch restaurant details" })
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching restaurant details:", expect.any(Error))

    consoleErrorSpy.mockRestore()
  })
})
