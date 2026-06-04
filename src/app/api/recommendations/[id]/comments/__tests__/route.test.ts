import { NextRequest } from "next/server"
import { POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliqueMember: {
      findUnique: jest.fn(),
    },
    cliqueRecommendation: {
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

/**
 * Builds a POST request, optionally with a cliqueId query param.
 */
function makeRequest(id: string, content: unknown, cliqueId?: string) {
  const url = cliqueId
    ? `http://localhost/api/recommendations/${id}/comments?cliqueId=${cliqueId}`
    : `http://localhost/api/recommendations/${id}/comments`
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

/** Marks the user as a member of the clique and the reco as part of it. */
function grantCliqueAccess() {
  ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" })
  ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
    recommendationId: "rec1",
  })
}

describe("POST /api/recommendations/[id]/comments", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should return 401 when not authenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const response = await POST(makeRequest("rec1", "Great!", "clq1"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 400 when comment content is missing", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const response = await POST(makeRequest("rec1", "", "clq1"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Comment cannot be empty" })
  })

  it("should return 400 when comment exceeds 500 characters", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const response = await POST(makeRequest("rec1", "a".repeat(501), "clq1"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Comment must be 500 characters or less" })
  })

  it("should return 400 when cliqueId is missing", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const response = await POST(makeRequest("rec1", "Great!"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "cliqueId is required" })
    expect(prisma.comment.create).not.toHaveBeenCalled()
  })

  it("should return 403 when the user is not a member of the clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
      recommendationId: "rec1",
    })

    const response = await POST(makeRequest("rec1", "Great!", "clq1"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
    expect(prisma.comment.create).not.toHaveBeenCalled()
  })

  it("should return 404 when the recommendation is not in the clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const response = await POST(makeRequest("rec1", "Great!", "clq1"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Recommendation not found in clique" })
    expect(prisma.comment.create).not.toHaveBeenCalled()
  })

  it("should create a clique-scoped comment successfully", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    grantCliqueAccess()

    const mockComment = {
      id: "comment1",
      content: "Great recommendation!",
      cliqueId: "clq1",
      createdAt: new Date().toISOString(),
      user: { id: "user1", name: "John Doe", image: null },
    }
    ;(prisma.comment.create as jest.Mock).mockResolvedValue(mockComment)

    const response = await POST(
      makeRequest("rec1", "Great recommendation!", "clq1"),
      { params: Promise.resolve({ id: "rec1" }) }
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(mockComment)
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: "Great recommendation!",
        userId: "user1",
        recommendationId: "rec1",
        cliqueId: "clq1",
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })
  })

  it("should trim whitespace and persist the cliqueId", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    grantCliqueAccess()
    ;(prisma.comment.create as jest.Mock).mockResolvedValue({ id: "comment1" })

    const response = await POST(
      makeRequest("rec1", "  Great recommendation!  ", "clq1"),
      { params: Promise.resolve({ id: "rec1" }) }
    )

    expect(response.status).toBe(201)
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: "Great recommendation!",
        userId: "user1",
        recommendationId: "rec1",
        cliqueId: "clq1",
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })
  })

  it("scopes the comment to the clique passed in the query", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
      recommendationId: "rec1",
    })
    ;(prisma.comment.create as jest.Mock).mockResolvedValue({ id: "comment2" })

    await POST(makeRequest("rec1", "In clique two", "clq2"), {
      params: Promise.resolve({ id: "rec1" }),
    })

    expect(prisma.cliqueMember.findUnique).toHaveBeenCalledWith({
      where: { cliqueId_userId: { cliqueId: "clq2", userId: "user1" } },
      select: { userId: true },
    })
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cliqueId: "clq2" }),
      })
    )
  })

  it("should handle database errors gracefully", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    grantCliqueAccess()
    ;(prisma.comment.create as jest.Mock).mockRejectedValue(new Error("Database error"))

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const response = await POST(makeRequest("rec1", "Great!", "clq1"), {
      params: Promise.resolve({ id: "rec1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to add comment" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
