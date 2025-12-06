import { GET } from "../route"
import { prisma } from "@/lib/prisma"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
  },
}))

describe("GET /api/categories", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return all active categories", async () => {
    // Arrange
    const mockCategories = [
      { id: "1", name: "Restaurants", slug: "restaurants", isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", name: "Movies", slug: "movies", isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "3", name: "Fashion", slug: "fashion", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]

    ;(prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toHaveLength(3)
    expect(data[0]).toHaveProperty("name", "Restaurants")
    expect(data[1]).toHaveProperty("name", "Movies")
    expect(data[2]).toHaveProperty("name", "Fashion")
    
    // Verify Prisma was called correctly
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })
  })

  it("should return empty array when no categories exist", async () => {
    // Arrange
    ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it("should handle database errors gracefully", async () => {
    // Arrange
    const dbError = new Error("Database connection failed")
    ;(prisma.category.findMany as jest.Mock).mockRejectedValue(dbError)

    // Suppress console.error for this test
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toHaveProperty("error", "Failed to fetch categories")
    expect(consoleErrorSpy).toHaveBeenCalled()
    
    consoleErrorSpy.mockRestore()
  })

  it("should only return active categories", async () => {
    // Arrange
    const mockCategories = [
      { id: "1", name: "Restaurants", slug: "restaurants", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]

    ;(prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

    // Act
    await GET()

    // Assert
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })

  it("should return categories in alphabetical order", async () => {
    // Arrange
    const mockCategories = [
      { id: "3", name: "Fashion", slug: "fashion", isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", name: "Movies", slug: "movies", isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "1", name: "Restaurants", slug: "restaurants", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]

    ;(prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
      })
    )
  })
})
