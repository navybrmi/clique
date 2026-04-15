import { NextRequest } from "next/server"
import { GET, POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    cliqueMember: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

describe("GET /api/cliques", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return empty array for a user with no cliques", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findMany as jest.Mock).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it("should return all cliques the user belongs to", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    const mockCliques = [
      {
        id: "clique1",
        name: "Movie Buffs",
        creatorId: "user1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        _count: { members: 3 },
      },
      {
        id: "clique2",
        name: "Foodies",
        creatorId: "user2",
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        _count: { members: 5 },
      },
    ]
    ;(prisma.clique.findMany as jest.Mock).mockResolvedValue(mockCliques)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe("Movie Buffs")
    expect(data[1].name).toBe("Foodies")
    expect(prisma.clique.findMany).toHaveBeenCalledWith({
      where: {
        members: {
          some: { userId: "user1" },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findMany as jest.Mock).mockRejectedValue(
      new Error("Database error")
    )

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to fetch cliques" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should not return cliques the user does not belong to", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findMany as jest.Mock).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    // Verify the query filters by membership
    expect(prisma.clique.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          members: {
            some: { userId: "user1" },
          },
        },
      })
    )
  })
})

describe("POST /api/cliques", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "Test Clique" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should create a clique with a valid name", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    const createdClique = {
      id: "clique1",
      name: "Movie Buffs",
      creatorId: "user1",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      _count: { members: 1 },
    }

    // Mock $transaction to execute the callback with a mock tx
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue(undefined),
        cliqueMember: { count: jest.fn().mockResolvedValue(0) },
        clique: { create: jest.fn().mockResolvedValue(createdClique) },
      }
      return cb(tx)
    })

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "Movie Buffs" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe("Movie Buffs")
    expect(data._count.members).toBe(1)
  })

  it("should return 400 when name is missing", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Name is required" })
  })

  it("should return 400 when name is empty string", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: "Name is required" })
  })

  it("should return 409 when user already belongs to 10 cliques", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue(undefined),
        cliqueMember: { count: jest.fn().mockResolvedValue(10) },
        clique: { create: jest.fn() },
      }
      return cb(tx)
    })

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "One Too Many" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toEqual({ error: "You can belong to a maximum of 10 cliques" })
  })

  it("should trim whitespace from clique name", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    const createdClique = {
      id: "clique1",
      name: "Trimmed Name",
      creatorId: "user1",
      _count: { members: 1 },
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue(undefined),
        cliqueMember: { count: jest.fn().mockResolvedValue(0) },
        clique: {
          create: jest.fn().mockResolvedValue(createdClique),
        },
      }
      return cb(tx)
    })

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "  Trimmed Name  " }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe("Trimmed Name")
  })

  it("should acquire advisory lock during creation", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    let capturedLockCall: unknown[] = []
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRawUnsafe: jest.fn().mockImplementation((...args: unknown[]) => {
          capturedLockCall = args
          return Promise.resolve(undefined)
        }),
        cliqueMember: { count: jest.fn().mockResolvedValue(0) },
        clique: {
          create: jest.fn().mockResolvedValue({
            id: "clique1",
            name: "Test",
            creatorId: "user1",
            _count: { members: 1 },
          }),
        },
      }
      return cb(tx)
    })

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    })

    await POST(request)

    expect(capturedLockCall[0]).toBe("SELECT pg_advisory_xact_lock($1)")
    expect(typeof capturedLockCall[1]).toBe("number")
  })

  it("should handle database errors during creation", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    ;(prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("Database error")
    )

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost/api/cliques", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to create clique" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
