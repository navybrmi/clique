import { NextRequest } from "next/server"
import { POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findUnique: jest.fn(),
    },
    comment: {
      create: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

describe("POST /api/recommendations/[id]/comments", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should return 401 when not authenticated", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Great recommendation!" }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 400 when comment content is missing", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Comment cannot be empty" })
  })

  it("should return 400 when comment exceeds 500 characters", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const longComment = "a".repeat(501)
    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments", {
      method: "POST",
      body: JSON.stringify({ content: longComment }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Comment must be 500 characters or less" })
  })

  it("should return 404 when recommendation not found", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/nonexistent/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Great recommendation!" }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "nonexistent" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Recommendation not found" })
  })

  it("should create comment successfully", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({ id: "rec1" })

    const createdAt = new Date()
    const mockComment = {
      id: "comment1",
      content: "Great recommendation!",
      createdAt: createdAt.toISOString(),
      user: {
        id: "user1",
        name: "John Doe",
        image: null,
      },
    }

    ;(prisma.comment.create as jest.Mock).mockResolvedValue(mockComment)

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Great recommendation!" }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data).toEqual(mockComment)
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: "Great recommendation!",
        userId: "user1",
        recommendationId: "rec1",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })
  })

  it("should trim whitespace from comment", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({ id: "rec1" })

    const mockComment = {
      id: "comment1",
      content: "Great recommendation!",
      createdAt: new Date(),
      user: { id: "user1", name: "John Doe", image: null },
    }

    ;(prisma.comment.create as jest.Mock).mockResolvedValue(mockComment)

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "  Great recommendation!  " }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "rec1" }) })

    // Assert
    expect(response.status).toBe(201)
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: "Great recommendation!",
        userId: "user1",
        recommendationId: "rec1",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })
  })

  it("should handle database errors gracefully", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({ id: "rec1" })

    const dbError = new Error("Database error")
    ;(prisma.comment.create as jest.Mock).mockRejectedValue(dbError)

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Great recommendation!" }),
    })

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: "rec1" }) })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to add comment" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
