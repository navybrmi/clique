import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { GET, POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    clique: {
      findUnique: jest.fn(),
    },
    cliqueMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    cliqueRecommendation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    recommendation: {
      findUnique: jest.fn(),
    },
  }

  return {
    prisma: mockPrisma,
    getPrismaClient: jest.fn(() => mockPrisma),
  }
})

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// Shared test fixtures
const mockRecommendationRow = (submitterUserId: string) => ({
  cliqueId: "clique1",
  recommendationId: "rec1",
  addedAt: new Date("2026-01-01T00:00:00.000Z"),
  addedBy: { name: "Alice" },
  recommendation: {
    id: "rec1",
    tags: ["action"],
    link: null,
    imageUrl: null,
    rating: 4,
    createdAt: new Date("2025-12-01T00:00:00.000Z"),
    user: { id: submitterUserId, name: "Bob" },
    entity: {
      id: "entity1",
      name: "The Matrix",
      category: { id: "cat1", name: "movies", displayName: "Movies" },
    },
    _count: { upvotes: 5, comments: 2 },
  },
})

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/cliques/[id]/recommendations
// ──────────────────────────────────────────────────────────────────────────────
describe("GET /api/cliques/[id]/recommendations", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("should return 403 when requester is not a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ id: "clique1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Forbidden" })
  })

  it("should return 404 when clique does not exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/nonexistent/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) })

    expect(res.status).toBe(404)
  })

  it("should return only recommendations explicitly added to the clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([
      mockRecommendationRow("user2"),
    ])
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([
      { userId: "user1" },
    ])

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].recommendationId).toBe("rec1")
    // Verify query is scoped to the clique
    expect(prisma.cliqueRecommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cliqueId: "clique1" } })
    )
  })

  it("should include submitterName when submitter is a clique member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([
      mockRecommendationRow("user2"),
    ])
    // user2 IS in the member list
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([
      { userId: "user1" },
      { userId: "user2" },
    ])

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data[0].submitterName).toBe("Bob")
  })

  it("should set submitterName to null when submitter is not a clique member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.cliqueRecommendation.findMany as jest.Mock).mockResolvedValue([
      mockRecommendationRow("user2"),
    ])
    // user2 is NOT in the member list
    ;(prisma.cliqueMember.findMany as jest.Mock).mockResolvedValue([
      { userId: "user1" },
    ])

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data[0].submitterName).toBeNull()
    expect(data[0].addedByName).toBe("Alice")
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/cliques/[id]/recommendations
// ──────────────────────────────────────────────────────────────────────────────
describe("POST /api/cliques/[id]/recommendations", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "rec1" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(401)
  })

  it("should return 403 when requester is not a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ id: "clique1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "rec1" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(403)
  })

  it("should return 400 when body is malformed JSON", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      // No body — request.json() will throw
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain("Invalid JSON")
  })

  it("should return 400 when recommendationId is missing", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain("recommendationId")
  })

  it("should return 404 when recommendation does not exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "nonexistent" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(404)
  })

  it("should return 409 when recommendation is already in this clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({ id: "rec1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
      cliqueId: "clique1",
      recommendationId: "rec1",
    })

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "rec1" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("already in this clique")
  })

  it("should create a CliqueRecommendation with addedById set to the current user", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({ id: "rec1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueRecommendation.create as jest.Mock).mockResolvedValue({})

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "rec1" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.message).toContain("added to clique")
    expect(prisma.cliqueRecommendation.create).toHaveBeenCalledWith({
      data: { cliqueId: "clique1", recommendationId: "rec1", addedById: "user1" },
    })
  })

  it("should return 409 when a concurrent request causes a unique-constraint violation", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.recommendation.findUnique as jest.Mock).mockResolvedValue({ id: "rec1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue(null) // fast-path passes
    ;(prisma.cliqueRecommendation.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.0.0",
      })
    )

    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "rec1" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("already in this clique")
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/cliques/clique1/recommendations", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "rec1" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
