import { GET, POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
    fashion: {
      create: jest.fn(),
    },
    household: {
      create: jest.fn(),
    },
    other: {
      create: jest.fn(),
    },
    cliqueMember: {
      count: jest.fn(),
    },
    cliqueRecommendation: {
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/tag-service", () => ({
  trackMultipleTags: jest.fn().mockResolvedValue(undefined),
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
  beforeEach(() => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({ categoryId: "cat1", entityName: "Test Entity" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 400 when categoryId is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        entityName: "Test Entity",
      }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "categoryId is required" })
  })

  it("should return 400 when both entityName and entityId are missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
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

  it("should return 400 when cliqueIds contains invalid values", async () => {
    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Test Entity",
        cliqueIds: ["clique-1", ""],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "cliqueIds must contain non-empty string IDs" })
  })

  it("should return 409 conflict metadata when recommendation already exists in target clique", async () => {
    ;(prisma.cliqueMember.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.cliqueRecommendation.findFirst as jest.Mock).mockResolvedValue({
      recommendation: {
        id: "rec-existing",
        entity: { name: "Inception" },
      },
    })

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "cat1",
        entityName: "Inception",
        cliqueIds: ["clique-1"],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toEqual({
      error: "A recommendation for this item already exists in this clique",
      code: "CLIQUE_RECOMMENDATION_EXISTS",
      conflict: true,
      existingRecommendationId: "rec-existing",
      entityName: "Inception",
    })
    expect(prisma.recommendation.create).not.toHaveBeenCalled()
  })

  it("should use raw SQL fallback for clique conflict checks when cliqueRecommendation delegate is unavailable", async () => {
    ;(prisma.cliqueMember.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        recommendationId: "rec-existing",
        entityName: "Inception",
      },
    ])

    const originalCliqueRecommendation = (
      prisma as unknown as { cliqueRecommendation?: unknown }
    ).cliqueRecommendation
    ;(prisma as unknown as { cliqueRecommendation?: unknown }).cliqueRecommendation =
      undefined

    try {
      const request = new NextRequest("http://localhost/api/recommendations", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat1",
          entityName: "Inception",
          cliqueIds: ["clique-1"],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        error: "A recommendation for this item already exists in this clique",
        code: "CLIQUE_RECOMMENDATION_EXISTS",
        conflict: true,
        existingRecommendationId: "rec-existing",
        entityName: "Inception",
      })
      expect(prisma.$queryRaw).toHaveBeenCalled()
    } finally {
      ;(prisma as unknown as { cliqueRecommendation?: unknown }).cliqueRecommendation =
        originalCliqueRecommendation
    }
  })

  it("should create recommendation and attach it to cliques", async () => {
    ;(prisma.cliqueMember.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.cliqueRecommendation.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue({
      id: "entity1",
      name: "Existing Entity",
      categoryId: "cat1",
    })
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue({
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
    })
    ;(prisma.cliqueRecommendation.createMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Existing Entity",
        cliqueIds: ["clique-1"],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
    })
    expect(prisma.cliqueRecommendation.createMany).toHaveBeenCalledWith({
      data: [
        {
          cliqueId: "clique-1",
          recommendationId: "rec1",
          addedById: "user1",
        },
      ],
      skipDuplicates: true,
    })
  })

  it("should allow creating new recommendation when forceCreateNew is true", async () => {
    ;(prisma.cliqueMember.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue({
      id: "entity1",
      name: "Inception",
      categoryId: "cat1",
    })
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue({
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
    })
    ;(prisma.cliqueRecommendation.createMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Inception",
        cliqueIds: ["clique-1"],
        forceCreateNew: true,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(prisma.cliqueRecommendation.findFirst).not.toHaveBeenCalled()
    expect(prisma.recommendation.create).toHaveBeenCalled()
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

  it("should return 403 when user is not a member of a selected clique", async () => {
    ;(prisma.cliqueMember.count as jest.Mock).mockResolvedValue(0) // 0 < 1 clique

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Joe's Pizza",
        cliqueIds: ["clique-1"],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "You are not a member of one or more selected cliques" })
    expect(prisma.recommendation.create).not.toHaveBeenCalled()
  })

  it("should create a movie entity and recommendation when category is MOVIE", async () => {
    const mockEntity = { id: "entity1", name: "Inception", categoryId: "cat1" }
    const mockRecommendation = { id: "rec1", userId: "user1", entityId: "entity1" }

    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.entity.create as jest.Mock).mockResolvedValue(mockEntity)
    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat1", name: "MOVIE" })
    ;(prisma.movie.create as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Inception",
        movieData: { director: "Nolan", year: "2010", genre: "Sci-Fi", duration: "2h 28min" },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(prisma.movie.create).toHaveBeenCalledWith({
      data: {
        entityId: "entity1",
        director: "Nolan",
        year: 2010, // parsed from string
        genre: "Sci-Fi",
        duration: "2h 28min",
      },
    })
  })

  it("should create a fashion entity and recommendation when category is FASHION", async () => {
    const mockEntity = { id: "entity1", name: "Nike Air Max", categoryId: "cat1" }
    const mockRecommendation = { id: "rec1", userId: "user1", entityId: "entity1" }

    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.entity.create as jest.Mock).mockResolvedValue(mockEntity)
    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat1", name: "FASHION" })
    ;(prisma.fashion.create as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Nike Air Max",
        fashionData: { brand: "Nike", price: "$120", size: "10", color: "White" },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(prisma.fashion.create).toHaveBeenCalledWith({
      data: {
        entityId: "entity1",
        brand: "Nike",
        price: "$120",
        size: "10",
        color: "White",
      },
    })
  })

  it("should create a household entity and recommendation when category is HOUSEHOLD", async () => {
    const mockEntity = { id: "entity1", name: "Dyson V15", categoryId: "cat1" }
    const mockRecommendation = { id: "rec1", userId: "user1", entityId: "entity1" }

    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.entity.create as jest.Mock).mockResolvedValue(mockEntity)
    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat1", name: "HOUSEHOLD" })
    ;(prisma.household.create as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Dyson V15",
        householdData: { productType: "Vacuum", model: "V15", purchaseLink: "https://dyson.com" },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(prisma.household.create).toHaveBeenCalledWith({
      data: {
        entityId: "entity1",
        productType: "Vacuum",
        model: "V15",
        purchaseLink: "https://dyson.com",
      },
    })
  })

  it("should create an other entity and recommendation when category is OTHER", async () => {
    const mockEntity = { id: "entity1", name: "Meditation App", categoryId: "cat1" }
    const mockRecommendation = { id: "rec1", userId: "user1", entityId: "entity1" }

    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.entity.create as jest.Mock).mockResolvedValue(mockEntity)
    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat1", name: "OTHER" })
    ;(prisma.other.create as jest.Mock).mockResolvedValue({})
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue(mockRecommendation)

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Meditation App",
        otherData: { description: "Great for focus" },
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(prisma.other.create).toHaveBeenCalledWith({
      data: {
        entityId: "entity1",
        description: "Great for focus",
      },
    })
  })

  it("should still return 201 when tag tracking fails after recommendation is created", async () => {
    const { trackMultipleTags } = require("@/lib/tag-service")
    ;(trackMultipleTags as jest.Mock).mockRejectedValue(new Error("Tag service down"))
    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue({ id: "entity1", name: "Inception" })
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue({ id: "rec1", userId: "user1", entityId: "entity1" })

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Inception",
        tags: ["great film", "must watch"],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error tracking tags:", expect.any(Error))
    consoleErrorSpy.mockRestore()
  })

  it("should allow duplicate clique recommendation when allowDuplicateInClique is true", async () => {
    ;(prisma.cliqueMember.count as jest.Mock).mockResolvedValue(1)
    ;(prisma.entity.findFirst as jest.Mock).mockResolvedValue({ id: "entity1", name: "Inception" })
    ;(prisma.recommendation.create as jest.Mock).mockResolvedValue({ id: "rec1", userId: "user1", entityId: "entity1" })
    ;(prisma.cliqueRecommendation.createMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify({
        userId: "user1",
        categoryId: "cat1",
        entityName: "Inception",
        cliqueIds: ["clique-1"],
        allowDuplicateInClique: true,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    // cliqueRecommendation.findFirst (conflict check) should NOT be called when allowDuplicateInClique=true
    expect(prisma.cliqueRecommendation.findFirst).not.toHaveBeenCalled()
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
