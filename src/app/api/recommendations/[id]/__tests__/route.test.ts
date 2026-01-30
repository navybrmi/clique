import { NextRequest } from "next/server"
import { GET, PUT, DELETE } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { trackMultipleTags, decrementMultipleTags } from "@/lib/tag-service"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    restaurant: {
      upsert: jest.fn(),
    },
    movie: {
      upsert: jest.fn(),
    },
    fashion: {
      upsert: jest.fn(),
    },
    household: {
      upsert: jest.fn(),
    },
    other: {
      upsert: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// Mock tag service functions
jest.mock("@/lib/tag-service", () => ({
  trackMultipleTags: jest.fn(),
  decrementMultipleTags: jest.fn(),
}))

describe("GET /api/recommendations/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return recommendation with all related data", async () => {
    // Arrange
    const mockRecommendation = {
      id: "rec1",
      userId: "user1",
      entityId: "entity1",
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
      comments: [
        {
          id: "comment1",
          text: "Great recommendation!",
          user: { id: "user2", name: "Jane Doe", image: null },
        },
      ],
      upvotes: [
        { user: { id: "user3", name: "Bob Smith" } },
      ],
      _count: {
        upvotes: 1,
        comments: 1,
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(mockRecommendation)

    const request = new NextRequest("http://localhost/api/recommendations/rec1")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual(mockRecommendation)
    expect(prisma.recommendation.findUnique).toHaveBeenCalledWith({
      where: { id: "rec1" },
      include: expect.objectContaining({
        user: expect.any(Object),
        entity: expect.any(Object),
        comments: expect.any(Object),
        upvotes: expect.any(Object),
        _count: expect.any(Object),
      }),
    })
  })

  it("should return 404 when recommendation not found", async () => {
    // Arrange
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/nonexistent")

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "nonexistent" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Recommendation not found" })
  })

  it("should handle database errors", async () => {
    // Arrange
    const dbError = new Error("Database error")
    ;(prisma.recommendation.findUnique as jest.Mock).mockRejectedValue(dbError)

    const request = new NextRequest("http://localhost/api/recommendations/rec1")

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to fetch recommendation" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})

describe("PUT /api/recommendations/[id]", () => {
  beforeEach(() => {
    // Reset all mocks before each test to prevent test pollution
    jest.resetAllMocks()
  })

  it("should return 401 when not authenticated", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({ tags: "updated" }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 404 when recommendation not found", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/nonexistent", {
      method: "PUT",
      body: JSON.stringify({ tags: "updated" }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "nonexistent" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Recommendation not found" })
  })

  it("should return 403 when user doesn't own recommendation", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      userId: "user2",
      entityId: "entity1",
    })

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({ tags: "updated" }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  it("should update recommendation successfully", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: ["old-tag"],
      entity: {
        categoryId: "cat1",
      },
    }

    const updatedRec = {
      id: "rec1",
      userId: "user1",
      tags: ["updated", "tags"],
      rating: 5,
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce(updatedRec)
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue(updatedRec)

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: ["updated", "tags"],
        rating: 5,
        link: "https://example.com",
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(prisma.recommendation.update).toHaveBeenCalledWith({
      where: { id: "rec1" },
      data: expect.objectContaining({
        tags: ["updated", "tags"],
        rating: 5,
        link: "https://example.com",
      }),
    })
  })

  it("should update restaurant data when provided", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: [],
      entity: {
        categoryId: "cat1",
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce({ id: "rec1" })
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})
    ;(prisma.restaurant.upsert as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: [],
        restaurantData: {
          cuisine: "Italian",
          location: "123 Main St",
        },
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })

    // Assert
    expect(response.status).toBe(200)
    expect(prisma.restaurant.upsert).toHaveBeenCalledWith({
      where: { entityId: "entity1" },
      update: { cuisine: "Italian", location: "123 Main St" },
      create: {
        entityId: "entity1",
        cuisine: "Italian",
        location: "123 Main St",
      },
    })
  })

  it("should track added tags when updating recommendation", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(trackMultipleTags as jest.Mock).mockResolvedValue([])
    ;(decrementMultipleTags as jest.Mock).mockResolvedValue([])
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: ["old-tag"],
      entity: {
        categoryId: "cat1",
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce({ id: "rec1", tags: ["old-tag", "new-tag"] })
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: ["old-tag", "new-tag"],
        rating: 5,
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })

    // Assert
    expect(response.status).toBe(200)
    expect(trackMultipleTags).toHaveBeenCalledWith(["new-tag"], "cat1")
    expect(decrementMultipleTags).not.toHaveBeenCalled()
  })

  it("should decrement removed tags when updating recommendation", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(trackMultipleTags as jest.Mock).mockResolvedValue([])
    ;(decrementMultipleTags as jest.Mock).mockResolvedValue([])
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: ["old-tag", "removed-tag"],
      entity: {
        categoryId: "cat1",
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce({ id: "rec1", tags: ["old-tag"] })
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: ["old-tag"],
        rating: 5,
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })

    // Assert
    expect(response.status).toBe(200)
    expect(decrementMultipleTags).toHaveBeenCalledWith(["removed-tag"], "cat1")
    expect(trackMultipleTags).not.toHaveBeenCalled()
  })

  it("should track added tags and decrement removed tags in same update", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(trackMultipleTags as jest.Mock).mockResolvedValue([])
    ;(decrementMultipleTags as jest.Mock).mockResolvedValue([])
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: ["keep-tag", "remove-tag"],
      entity: {
        categoryId: "cat1",
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce({ id: "rec1", tags: ["keep-tag", "new-tag"] })
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: ["keep-tag", "new-tag"],
        rating: 5,
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })

    // Assert
    expect(response.status).toBe(200)
    expect(trackMultipleTags).toHaveBeenCalledWith(["new-tag"], "cat1")
    expect(decrementMultipleTags).toHaveBeenCalledWith(["remove-tag"], "cat1")
  })

  it("should handle empty tags array updates", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(trackMultipleTags as jest.Mock).mockResolvedValue([])
    ;(decrementMultipleTags as jest.Mock).mockResolvedValue([])
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: ["old-tag"],
      entity: {
        categoryId: "cat1",
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce({ id: "rec1", tags: [] })
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: [],
        rating: 5,
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })

    // Assert
    expect(response.status).toBe(200)
    expect(trackMultipleTags).not.toHaveBeenCalled()
    expect(decrementMultipleTags).toHaveBeenCalledWith(["old-tag"], "cat1")
  })

  it("should handle tag tracking errors gracefully", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(trackMultipleTags as jest.Mock).mockRejectedValue(new Error("Tag tracking failed"))
    ;(decrementMultipleTags as jest.Mock).mockResolvedValue([])
    
    const existingRec = {
      userId: "user1",
      entityId: "entity1",
      tags: ["old-tag"],
      entity: {
        categoryId: "cat1",
      },
    }

    ;(prisma.recommendation.findUnique as jest.Mock)
      .mockResolvedValueOnce(existingRec)
      .mockResolvedValueOnce({ id: "rec1" })
    ;(prisma.recommendation.update as jest.Mock).mockResolvedValue({})

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({
        tags: ["old-tag", "new-tag"],
        rating: 5,
      }),
    })

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toHaveProperty("error", "Failed to update recommendation")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should handle database errors during update", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(trackMultipleTags as jest.Mock).mockResolvedValue([])
    ;(decrementMultipleTags as jest.Mock).mockResolvedValue([])
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      userId: "user1",
      entityId: "entity1",
      tags: [],
      entity: {
        categoryId: "cat1",
      },
    })
    
    const dbError = new Error("Database error")
    ;(prisma.recommendation.update as jest.Mock).mockRejectedValue(dbError)

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "PUT",
      body: JSON.stringify({ tags: "updated" }),
    })

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await PUT(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toHaveProperty("error", "Failed to update recommendation")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})

describe("DELETE /api/recommendations/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when not authenticated", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 404 when recommendation not found", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    
    // Clear previous mocks and set up for this test
    ;(prisma.recommendation.findUnique as jest.Mock).mockReset()
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/nonexistent", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, { params: Promise.resolve({ id: "nonexistent" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Recommendation not found" })
  })

  it("should return 403 when user doesn't own recommendation", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      userId: "user2",
    })

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  it("should delete recommendation successfully", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      userId: "user1",
    })
    ;(prisma.recommendation.delete as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ message: "Recommendation deleted" })
    expect(prisma.recommendation.delete).toHaveBeenCalledWith({
      where: { id: "rec1" },
    })
  })

  it("should handle database errors during deletion", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({
      userId: "user1",
    })
    
    const dbError = new Error("Database error")
    ;(prisma.recommendation.delete as jest.Mock).mockRejectedValue(dbError)

    const request = new NextRequest("http://localhost/api/recommendations/rec1", {
      method: "DELETE",
    })

    // Suppress console.error
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await DELETE(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to delete recommendation" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
