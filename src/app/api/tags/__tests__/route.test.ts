/**
 * Tests for GET /api/tags endpoint
 */

import { GET } from "../route"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
    },
    communityTag: {
      findMany: jest.fn(),
    },
  },
}))

// Mock tag service
jest.mock("@/lib/tag-service", () => ({
  getPromotedTagsForCategory: jest.fn(),
}))

// Mock movie tags
jest.mock("@/lib/movie-tags", () => ({
  getHardcodedMovieTags: jest.fn(() => [
    "Action-Packed",
    "Mind-Bending",
    "Thought-Provoking",
    "Heartwarming",
    "Edge-of-Your-Seat",
  ]),
  normalizeTagForComparison: (tag: string) => tag.toLowerCase().trim(),
}))

import { getPromotedTagsForCategory } from "@/lib/tag-service"

describe("GET /api/tags", () => {
  const mockMovieCategoryId = "cat-movie-123"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return hardcoded + promoted tags for MOVIE category", async () => {
    const mockCategory = {
      id: mockMovieCategoryId,
      name: "MOVIE",
    }

    const mockPromotedTags = ["Visually Stunning", "Character-Driven"]

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)
    ;(getPromotedTagsForCategory as jest.Mock).mockResolvedValue(mockPromotedTags)

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tags).toContain("Action-Packed")
    expect(data.tags).toContain("Mind-Bending")
    expect(data.tags).toContain("Visually Stunning")
    expect(data.tags).toContain("Character-Driven")
    expect(data.tags.length).toBe(7) // 5 hardcoded + 2 promoted
  })

  it("should deduplicate tags with case-insensitive matching", async () => {
    const mockCategory = {
      id: mockMovieCategoryId,
      name: "MOVIE",
    }

    // Promoted tag that matches hardcoded tag (different case)
    const mockPromotedTags = [
      "action-packed", // lowercase version of hardcoded "Action-Packed"
      "Custom Tag",
    ]

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)
    ;(getPromotedTagsForCategory as jest.Mock).mockResolvedValue(mockPromotedTags)

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should not have duplicate "action-packed" - hardcoded version should be preserved
    const actionTags = data.tags.filter(
      (tag: string) => tag.toLowerCase() === "action-packed"
    )
    expect(actionTags).toHaveLength(1)
    expect(actionTags[0]).toBe("Action-Packed") // Hardcoded version preserved
    expect(data.tags).toContain("Custom Tag")
  })

  it("should return only hardcoded tags when no promoted tags exist", async () => {
    const mockCategory = {
      id: mockMovieCategoryId,
      name: "MOVIE",
    }

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)
    ;(getPromotedTagsForCategory as jest.Mock).mockResolvedValue([])

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tags).toHaveLength(5) // Only hardcoded tags
    expect(data.tags).toContain("Action-Packed")
    expect(data.tags).toContain("Mind-Bending")
  })

  it("should return empty array for non-MOVIE categories", async () => {
    const mockCategory = {
      id: "cat-restaurant-123",
      name: "RESTAURANT",
    }

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=RESTAURANT")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tags).toEqual([])
    expect(prisma.communityTag.findMany).not.toHaveBeenCalled()
  })

  it("should return 400 when categoryName is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/tags")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("categoryName query parameter is required")
  })

  it("should return 404 when category not found", async () => {
    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=INVALID")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Category "INVALID" not found')
  })

  it("should handle database errors gracefully", async () => {
    const dbError = new Error("Database connection failed")
    ;(prisma.category.findUnique as jest.Mock).mockRejectedValue(dbError)

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch tags")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should handle errors when fetching promoted tags", async () => {
    const mockCategory = {
      id: mockMovieCategoryId,
      name: "MOVIE",
    }

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)
    ;(getPromotedTagsForCategory as jest.Mock).mockRejectedValue(
      new Error("DB error")
    )

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch tags")
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should sort promoted tags by usage count descending", async () => {
    const mockCategory = {
      id: mockMovieCategoryId,
      name: "MOVIE",
    }

    const mockPromotedTags = ["Most Popular", "Less Popular"]

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)
    ;(getPromotedTagsForCategory as jest.Mock).mockResolvedValue(mockPromotedTags)

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    await GET(request)

    // getPromotedTagsForCategory is already sorted by the service
    expect(getPromotedTagsForCategory).toHaveBeenCalledWith(mockMovieCategoryId)
  })

  it("should preserve original case of promoted tags", async () => {
    const mockCategory = {
      id: mockMovieCategoryId,
      name: "MOVIE",
    }

    const mockPromotedTags = ["MiXeD CaSe TaG"]

    ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory)
    ;(getPromotedTagsForCategory as jest.Mock).mockResolvedValue(mockPromotedTags)

    const request = new NextRequest("http://localhost:3000/api/tags?categoryName=MOVIE")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tags).toContain("MiXeD CaSe TaG") // Original case preserved
  })
})
