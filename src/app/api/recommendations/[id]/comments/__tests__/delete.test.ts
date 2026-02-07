import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// Import route AFTER mocks are set up
import { DELETE } from "../[commentId]/route"

describe("DELETE /api/recommendations/[id]/comments/[commentId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should delete a comment successfully if user owns it", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "comment1",
      content: "Great!",
      userId: "user1",
      recommendationId: "rec1",
    })
    ;(prisma.comment.delete as jest.Mock).mockResolvedValue({
      id: "comment1",
      content: "Great!",
      userId: "user1",
      recommendationId: "rec1",
      createdAt: "2026-02-06T12:00:00Z",
    })

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.id).toBe("comment1")
    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: "comment1" },
    })
  })

  it("should return 401 if user is not authenticated", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should return 401 if session has no user", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: null })

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should return 404 if comment does not exist", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe("Comment not found")
  })

  it("should return 404 if comment belongs to different recommendation", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "comment1",
      content: "Great!",
      userId: "user1",
      recommendationId: "rec2", // Different recommendation
    })

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe("Comment not found")
  })

  it("should return 403 if user does not own the comment", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "comment1",
      content: "Great!",
      userId: "user2", // Different user
      recommendationId: "rec1",
    })

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("Forbidden")
    expect(prisma.comment.delete).not.toHaveBeenCalled()
  })

  it("should handle database errors gracefully", async () => {
    // Arrange
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "comment1",
      content: "Great!",
      userId: "user1",
      recommendationId: "rec1",
    })
    ;(prisma.comment.delete as jest.Mock).mockRejectedValue(
      new Error("Database error")
    )

    const request = new NextRequest("http://localhost/api/recommendations/rec1/comments/comment1", {
      method: "DELETE",
    })

    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "rec1", commentId: "comment1" }),
    })

    // Assert
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe("Failed to delete comment")
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
