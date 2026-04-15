import { NextRequest } from "next/server"
import { GET, DELETE } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    cliqueMember: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

describe("GET /api/cliques/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/cliques/clique1")
    const response = await GET(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 404 for a non-existent clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/cliques/nonexistent")
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Clique not found" })
  })

  it("should return 403 when user is not a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ id: "clique1" })

    const request = new NextRequest("http://localhost/api/cliques/clique1")
    const response = await GET(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error")
    )

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost/api/cliques/clique1")
    const response = await GET(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to fetch clique" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should return clique details with members for a valid member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })

    const mockClique = {
      id: "clique1",
      name: "Movie Buffs",
      creatorId: "user1",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      creator: { id: "user1", name: "Alice", image: null },
      members: [
        {
          cliqueId: "clique1",
          userId: "user1",
          user: { id: "user1", name: "Alice", image: null, email: "alice@test.com" },
        },
        {
          cliqueId: "clique1",
          userId: "user2",
          user: { id: "user2", name: "Bob", image: null, email: "bob@test.com" },
        },
      ],
      _count: { members: 2 },
    }
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({
      cliqueId: "clique1",
      userId: "user1",
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(mockClique)

    const request = new NextRequest("http://localhost/api/cliques/clique1")
    const response = await GET(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe("Movie Buffs")
    expect(data.members).toHaveLength(2)
    expect(data.creator.name).toBe("Alice")
    expect(data._count.members).toBe(2)
  })
})

describe("DELETE /api/cliques/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/cliques/clique1", {
      method: "DELETE",
    })
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 404 for a non-existent clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost/api/cliques/nonexistent", {
      method: "DELETE",
    })
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Clique not found" })
  })

  it("should return 403 when user is not the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user2",
    })

    const request = new NextRequest("http://localhost/api/cliques/clique1", {
      method: "DELETE",
    })
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  it("should handle database errors during deletion", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user1",
    })
    ;(prisma.clique.delete as jest.Mock).mockRejectedValue(
      new Error("Database error")
    )

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest("http://localhost/api/cliques/clique1", {
      method: "DELETE",
    })
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to delete clique" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should delete the clique when requester is the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user1",
    })
    ;(prisma.clique.delete as jest.Mock).mockResolvedValue({})

    const request = new NextRequest("http://localhost/api/cliques/clique1", {
      method: "DELETE",
    })
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ message: "Clique deleted" })
    expect(prisma.clique.delete).toHaveBeenCalledWith({
      where: { id: "clique1" },
    })
  })
})
