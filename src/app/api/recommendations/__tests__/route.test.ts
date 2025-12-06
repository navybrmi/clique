import { GET, POST } from "../route"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    entity: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    restaurant: {
      create: jest.fn(),
    },
    movie: {
      create: jest.fn(),
    },
  },
}))

describe("GET /api/recommendations", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return all recommendations with related data", async () => {
    // Arrange
    const mockRecommendations = [
      {
        id: "rec1",
        userId: "user1",
        entityId: "entity1",
        createdAt: new Date("2024-01-01"),
        user: {
          id: "user1",
          name: "John Doe",
          image: "https://example.com/avatar.jpg",
        },
        entity: {
          id: "entity1",
          name: "Test Restaurant",
          category: { id: "cat1", name: "Restaurants" },
          restaurant: { id: "rest1", cuisine: "Italian" },
          movie: null,
          fashion: null,
          household: null,
          other: null,
        },
        _count: {
          upvotes: 5,
          comments: 3,
        },
      },
    ]

    ;(prisma.recommendation.findMany as jest.Mock).mockResolvedValue(mockRecommendations)

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    // Dates are serialized to strings in JSON responses
    expect(data[0].createdAt).toBe("2024-01-01T00:00:00.000Z")
    expect(data[0].id).toBe("rec1")
    expect(data[0].entity.name).toBe("Test Restaurant")
    expect(prisma.recommendation.findMany).toHaveBeenCalledWith({
      include: expect.objectContaining({
        user: expect.any(Object),
        entity: expect.any(Object),
        _count: expect.any(Object),
      }),
      orderBy: {
        createdAt: "desc",
      },
    })
  })

  it("should return empty array when no recommendations exist", async () => {
    // Arrange
    ;(prisma.recommendation.findMany as jest.Mock).mockResolvedValue([])

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it("should handle database errors", async () => {
    // Arrange
    const dbError = new Error("Database connection failed")
    ;(prisma.recommendation.findMany as jest.Mock).mockRejectedValue(dbError)

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: "Failed to fetch recommendations",
      details: "Database connection failed",
    })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})

describe("POST /api/recommendations", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 400 when userId is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "cat1",
        entityName: "Test Entity",
      }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "userId and categoryId are required" })
  })

  it("should return 400 when categoryId is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        entityName: "Test Entity",
      }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "userId and categoryId are required" })
  })

  it("should return 400 when both entityName and entityId are missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
      }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Either entityName or entityId is required" })
  })

  it("should create recommendation with existing entity", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityId: "entity1",
        tags: "great,amazing",
        rating: 5,
      }),
    })

    const mockRecommendation = {
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
      tags: "great,amazing",
      rating: 5,
    }

    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data).toEqual(mockRecommendation)
    expect(prisma.entity.findFirst).not.toHaveBeenCalled()
  })

  it("should create new entity and recommendation when entity doesn't exist", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "New Restaurant",
        imageUrl: "https://example.com/image.jpg",
        restaurantData: {
          cuisine: "Italian",
          location: "123 Main St",
          priceRange: "$$",
        },
      }),
    })

    const mockEntity = {
      id: "entity1",
      name: "New Restaurant",
      categoryId: "cat1",
    }

    const mockRecommendation = {
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
    }

    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.entity.create as jest.Mock).mockResolvedValue(mockEntity)
    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat1", name: "RESTAURANT" })
    ;(prisma.restaurant.create as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data).toEqual(mockRecommendation)
    expect(prisma.entity.findFirst).toHaveBeenCalledWith({
      where: {
        name: "New Restaurant",
        categoryId: "cat1",
      },
    })
    expect(prisma.entity.create).toHaveBeenCalled()
  })

  it("should use existing entity if found", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Existing Restaurant",
      }),
    })

    const mockEntity = {
      id: "entity1",
      name: "Existing Restaurant",
      categoryId: "cat1",
    }

    const mockRecommendation = {
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
    }

    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue(mockEntity)
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(prisma.entity.findFirst).toHaveBeenCalled()
    expect(prisma.entity.create).not.toHaveBeenCalled()
    expect(data.entityId).toBe("entity1")
  })

  it("should handle database errors during creation", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityId: "entity1",
      }),
    })

    const dbError = new Error("Database error")
    ;(prisma.recommendation.create as jest.Mock).mockRejectedValue(dbError)

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toHaveProperty("error")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
