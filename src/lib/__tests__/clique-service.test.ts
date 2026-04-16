import { getCliqueFeed } from "@/lib/clique-service"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliqueRecommendation: {
      findMany: jest.fn(),
    },
    cliqueMember: {
      findMany: jest.fn(),
    },
  },
}))

/** Builds a minimal recommendation row for testing entity field mapping. */
const makeRow = (entityOverrides: Record<string, unknown> = {}) => ({
  cliqueId: "clique1",
  recommendationId: "rec1",
  addedAt: new Date("2026-01-01T00:00:00.000Z"),
  addedBy: { name: "Alice" },
  recommendation: {
    id: "rec1",
    tags: ["cozy"],
    link: null,
    imageUrl: null,
    rating: 4,
    createdAt: new Date("2025-12-01T00:00:00.000Z"),
    user: { id: "user2", name: "Bob" },
    entity: {
      id: "entity1",
      name: "Test Entity",
      category: { id: "cat1", name: "RESTAURANT", displayName: "Restaurant" },
      restaurant: null,
      movie: null,
      fashion: null,
      household: null,
      other: null,
      ...entityOverrides,
    },
    _count: { upvotes: 3, comments: 1 },
  },
})

describe("getCliqueFeed", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns empty array when no recommendations exist", async () => {
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed).toEqual([])
  })

  it("sets submitterName to the user name when submitter is a current member", async () => {
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([makeRow()])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([
      { userId: "user1" },
      { userId: "user2" }, // submitter is a member
    ])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].submitterName).toBe("Bob")
    expect(feed[0].addedByName).toBe("Alice")
  })

  it("sets submitterName to null when submitter is not a current member", async () => {
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([makeRow()])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([
      { userId: "user1" },
      // user2 (submitter) is NOT in the member list
    ])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].submitterName).toBeNull()
  })

  it("maps restaurant entity fields when restaurant data is present", async () => {
    const row = makeRow({
      restaurant: { cuisine: "Italian", location: "New York", priceRange: "$$" },
    })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([row])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([{ userId: "user1" }])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].recommendation.entity.restaurant).toEqual({
      cuisine: "Italian",
      location: "New York",
      priceRange: "$$",
    })
    expect(feed[0].recommendation.entity.movie).toBeNull()
  })

  it("maps restaurant entity fields with null values when restaurant fields are null", async () => {
    const row = makeRow({
      restaurant: { cuisine: null, location: null, priceRange: null },
    })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([row])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([{ userId: "user1" }])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].recommendation.entity.restaurant).toEqual({
      cuisine: null,
      location: null,
      priceRange: null,
    })
  })

  it("maps movie entity fields when movie data is present", async () => {
    const row = makeRow({
      movie: { director: "Christopher Nolan", year: 2010, genre: "Sci-Fi", duration: "2h 28min" },
    })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([row])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([{ userId: "user1" }])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].recommendation.entity.movie).toEqual({
      director: "Christopher Nolan",
      year: 2010,
      genre: "Sci-Fi",
      duration: "2h 28min",
    })
    expect(feed[0].recommendation.entity.restaurant).toBeNull()
  })

  it("maps movie entity fields with null values when movie fields are null", async () => {
    const row = makeRow({
      movie: { director: null, year: null, genre: null, duration: null },
    })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([row])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([{ userId: "user1" }])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].recommendation.entity.movie).toEqual({
      director: null,
      year: null,
      genre: null,
      duration: null,
    })
  })

  it("maps fashion/household/other entity fields when present", async () => {
    const fashionData = { brand: "Nike", price: "$50", size: "M", color: "Blue" }
    const row = makeRow({ fashion: fashionData })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([row])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([{ userId: "user1" }])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0].recommendation.entity.fashion).toEqual(fashionData)
    expect(feed[0].recommendation.entity.household).toBeNull()
    expect(feed[0].recommendation.entity.other).toBeNull()
  })

  it("returns correct recommendation shape with all core fields", async () => {
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([makeRow()])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([])

    const feed = await getCliqueFeed("clique1", "user1")

    expect(feed[0]).toMatchObject({
      id: "rec1",
      recommendationId: "rec1",
      addedByName: "Alice",
      recommendation: {
        id: "rec1",
        tags: ["cozy"],
        rating: 4,
        _count: { upvotes: 3, comments: 1 },
      },
    })
  })
})
