/**
 * Tests for tag tracking and promotion service
 */

import {
  trackTagUsage,
  trackMultipleTags,
  decrementTagUsage,
  decrementMultipleTags,
  getPromotedTagsForCategory,
} from "../tag-service"
import { prisma } from "@/lib/prisma"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    communityTag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock movie tags
jest.mock("@/lib/movie-tags", () => ({
  isHardcodedMovieTag: jest.fn(),
  normalizeTagForComparison: (tag: string) => tag.toLowerCase().trim(),
}))

import { isHardcodedMovieTag } from "@/lib/movie-tags"

describe("Tag Service", () => {
  const mockCategoryId = "cat-123"

  beforeEach(() => {
    jest.clearAllMocks()
    ;(isHardcodedMovieTag as jest.Mock).mockReturnValue(false)
  })

  describe("trackTagUsage", () => {
    it("should create a new tag with usageCount 1 when it doesn't exist", async () => {
      const mockTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 1,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockTag)

      const result = await trackTagUsage("mind-bending", mockCategoryId)

      expect(result).toEqual(mockTag)
      expect(prisma.communityTag.upsert).toHaveBeenCalledWith({
        where: {
          tag_categoryId: {
            tag: "mind-bending",
            categoryId: mockCategoryId,
          },
        },
        update: {
          usageCount: {
            increment: 1,
          },
        },
        create: {
          tag: "mind-bending",
          categoryId: mockCategoryId,
          usageCount: 1,
          isPromoted: false,
        },
      })
    })

    it("should increment usageCount when tag already exists", async () => {
      const mockTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 15,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockTag)

      await trackTagUsage("mind-bending", mockCategoryId)

      expect(prisma.communityTag.upsert).toHaveBeenCalled()
    })

    it("should promote tag when usage reaches threshold (20)", async () => {
      const mockUpsertTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 20,
        isPromoted: false,
        createdAt: new Date(),
      }

      const mockPromotedTag = {
        ...mockUpsertTag,
        isPromoted: true,
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockUpsertTag)
      ;(prisma.communityTag.update as jest.Mock).mockResolvedValue(mockPromotedTag)

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()

      const result = await trackTagUsage("mind-bending", mockCategoryId)

      expect(result?.isPromoted).toBe(true)
      expect(prisma.communityTag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: { isPromoted: true },
      })
      expect(consoleLogSpy).toHaveBeenCalled()

      consoleLogSpy.mockRestore()
    })

    it("should promote tag when usage exceeds threshold", async () => {
      const mockUpsertTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 25,
        isPromoted: false,
        createdAt: new Date(),
      }

      const mockPromotedTag = {
        ...mockUpsertTag,
        isPromoted: true,
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockUpsertTag)
      ;(prisma.communityTag.update as jest.Mock).mockResolvedValue(mockPromotedTag)

      const result = await trackTagUsage("mind-bending", mockCategoryId)

      expect(result?.isPromoted).toBe(true)
    })

    it("should not promote tag if already promoted", async () => {
      const mockTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 25,
        isPromoted: true,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockTag)

      await trackTagUsage("mind-bending", mockCategoryId)

      expect(prisma.communityTag.update).not.toHaveBeenCalled()
    })

    it("should not track hardcoded tags", async () => {
      ;(isHardcodedMovieTag as jest.Mock).mockReturnValue(true)

      const result = await trackTagUsage("action-packed", mockCategoryId)

      expect(result).toBeNull()
      expect(prisma.communityTag.upsert).not.toHaveBeenCalled()
    })

    it("should trim whitespace from tags", async () => {
      const mockTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 1,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockTag)

      await trackTagUsage("  mind-bending  ", mockCategoryId)

      expect(prisma.communityTag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tag_categoryId: {
              tag: "mind-bending",
              categoryId: mockCategoryId,
            },
          },
        })
      )
    })

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed")
      ;(prisma.communityTag.upsert as jest.Mock).mockRejectedValue(dbError)

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

      await expect(trackTagUsage("test-tag", mockCategoryId)).rejects.toThrow(
        "Database connection failed"
      )

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe("trackMultipleTags", () => {
    it("should track all tags successfully", async () => {
      const mockTags = [
        {
          id: "tag-1",
          tag: "mind-bending",
          categoryId: mockCategoryId,
          usageCount: 1,
          isPromoted: false,
          createdAt: new Date(),
        },
        {
          id: "tag-2",
          tag: "thought-provoking",
          categoryId: mockCategoryId,
          usageCount: 1,
          isPromoted: false,
          createdAt: new Date(),
        },
      ]

      ;(prisma.communityTag.upsert as jest.Mock)
        .mockResolvedValueOnce(mockTags[0])
        .mockResolvedValueOnce(mockTags[1])

      const results = await trackMultipleTags(
        ["mind-bending", "thought-provoking"],
        mockCategoryId
      )

      expect(results).toHaveLength(2)
      expect(prisma.communityTag.upsert).toHaveBeenCalledTimes(2)
    })

    it("should filter out null results from hardcoded tags", async () => {
      ;(isHardcodedMovieTag as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)

      const mockTag = {
        id: "tag-1",
        tag: "custom-tag",
        categoryId: mockCategoryId,
        usageCount: 1,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.upsert as jest.Mock).mockResolvedValue(mockTag)

      const results = await trackMultipleTags(
        ["action-packed", "custom-tag"],
        mockCategoryId
      )

      expect(results).toHaveLength(1)
      expect(results[0]?.tag).toBe("custom-tag")
    })

    it("should handle errors gracefully and continue tracking other tags", async () => {
      const mockTag = {
        id: "tag-2",
        tag: "working-tag",
        categoryId: mockCategoryId,
        usageCount: 1,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.upsert as jest.Mock)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(mockTag)

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

      const results = await trackMultipleTags(
        ["failing-tag", "working-tag"],
        mockCategoryId
      )

      expect(results).toHaveLength(1)
      expect(results[0]?.tag).toBe("working-tag")
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe("decrementTagUsage", () => {
    it("should decrement usage count for existing tag", async () => {
      const existingTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 10,
        isPromoted: false,
        createdAt: new Date(),
      }

      const updatedTag = {
        ...existingTag,
        usageCount: 9,
      }

      ;(prisma.communityTag.findUnique as jest.Mock).mockResolvedValue(existingTag)
      ;(prisma.communityTag.update as jest.Mock).mockResolvedValue(updatedTag)

      const result = await decrementTagUsage("mind-bending", mockCategoryId)

      expect(result?.usageCount).toBe(9)
      expect(prisma.communityTag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: { usageCount: 9 },
      })
    })

    it("should delete tag when usage count reaches 0", async () => {
      const existingTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 1,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.findUnique as jest.Mock).mockResolvedValue(existingTag)
      ;(prisma.communityTag.delete as jest.Mock).mockResolvedValue(existingTag)

      const result = await decrementTagUsage("mind-bending", mockCategoryId)

      expect(result).toBeNull()
      expect(prisma.communityTag.delete).toHaveBeenCalledWith({
        where: { id: "tag-1" },
      })
    })

    it("should demote tag when usage drops below threshold", async () => {
      const existingTag = {
        id: "tag-1",
        tag: "mind-bending",
        categoryId: mockCategoryId,
        usageCount: 20,
        isPromoted: true,
        createdAt: new Date(),
      }

      const updatedTag = {
        ...existingTag,
        usageCount: 19,
      }

      const demotedTag = {
        ...updatedTag,
        isPromoted: false,
      }

      ;(prisma.communityTag.findUnique as jest.Mock).mockResolvedValue(existingTag)
      ;(prisma.communityTag.update as jest.Mock)
        .mockResolvedValueOnce(updatedTag)
        .mockResolvedValueOnce(demotedTag)

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()

      const result = await decrementTagUsage("mind-bending", mockCategoryId)

      expect(result?.isPromoted).toBe(false)
      expect(consoleLogSpy).toHaveBeenCalled()

      consoleLogSpy.mockRestore()
    })

    it("should not track hardcoded tags", async () => {
      ;(isHardcodedMovieTag as jest.Mock).mockReturnValue(true)

      const result = await decrementTagUsage("action-packed", mockCategoryId)

      expect(result).toBeNull()
      expect(prisma.communityTag.findUnique).not.toHaveBeenCalled()
    })

    it("should return null if tag not found", async () => {
      ;(prisma.communityTag.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await decrementTagUsage("non-existent", mockCategoryId)

      expect(result).toBeNull()
      expect(prisma.communityTag.update).not.toHaveBeenCalled()
    })
  })

  describe("decrementMultipleTags", () => {
    it("should decrement all tags successfully", async () => {
      const mockTags = [
        {
          id: "tag-1",
          tag: "mind-bending",
          categoryId: mockCategoryId,
          usageCount: 10,
          isPromoted: false,
          createdAt: new Date(),
        },
        {
          id: "tag-2",
          tag: "thought-provoking",
          categoryId: mockCategoryId,
          usageCount: 5,
          isPromoted: false,
          createdAt: new Date(),
        },
      ]

      ;(prisma.communityTag.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockTags[0], usageCount: 11 })
        .mockResolvedValueOnce({ ...mockTags[1], usageCount: 6 })

      ;(prisma.communityTag.update as jest.Mock)
        .mockResolvedValueOnce(mockTags[0])
        .mockResolvedValueOnce(mockTags[1])

      const results = await decrementMultipleTags(
        ["mind-bending", "thought-provoking"],
        mockCategoryId
      )

      expect(results).toHaveLength(2)
    })

    it("should handle errors gracefully", async () => {
      const mockTag = {
        id: "tag-2",
        tag: "working-tag",
        categoryId: mockCategoryId,
        usageCount: 5,
        isPromoted: false,
        createdAt: new Date(),
      }

      ;(prisma.communityTag.findUnique as jest.Mock)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ ...mockTag, usageCount: 6 })

      ;(prisma.communityTag.update as jest.Mock).mockResolvedValue(mockTag)

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

      const results = await decrementMultipleTags(
        ["failing-tag", "working-tag"],
        mockCategoryId
      )

      expect(results).toHaveLength(1)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe("getPromotedTagsForCategory", () => {
    it("should return all promoted tags for a category", async () => {
      const mockTags = [
        {
          tag: "mind-bending",
        },
        {
          tag: "thought-provoking",
        },
      ]

      ;(prisma.communityTag.findMany as jest.Mock).mockResolvedValue(mockTags)

      const results = await getPromotedTagsForCategory(mockCategoryId)

      expect(results).toEqual(["mind-bending", "thought-provoking"])
      expect(prisma.communityTag.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: mockCategoryId,
          isPromoted: true,
        },
        select: { tag: true },
        orderBy: { usageCount: "desc" },
      })
    })

    it("should return empty array when no promoted tags exist", async () => {
      ;(prisma.communityTag.findMany as jest.Mock).mockResolvedValue([])

      const results = await getPromotedTagsForCategory(mockCategoryId)

      expect(results).toEqual([])
    })

    it("should handle database errors gracefully", async () => {
      ;(prisma.communityTag.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      )

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

      const results = await getPromotedTagsForCategory(mockCategoryId)

      expect(results).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })
})
