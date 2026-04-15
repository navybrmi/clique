import { NextRequest } from "next/server"
import { DELETE } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: {
      findUnique: jest.fn(),
    },
    cliqueMember: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

describe("DELETE /api/cliques/[id]/members/[userId]", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      "http://localhost/api/cliques/clique1/members/user2",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1", userId: "user2" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: "Unauthorized" })
  })

  it("should return 403 when requester is not the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user2",
    })

    const request = new NextRequest(
      "http://localhost/api/cliques/clique1/members/user3",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1", userId: "user3" }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: "Forbidden" })
  })

  it("should return 404 when clique does not exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      "http://localhost/api/cliques/nonexistent/members/user2",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent", userId: "user2" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Clique not found" })
  })

  it("should return 404 when target user is not a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user1",
    })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      "http://localhost/api/cliques/clique1/members/user99",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1", userId: "user99" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: "Member not found" })
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error")
    )

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    const request = new NextRequest(
      "http://localhost/api/cliques/clique1/members/user2",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1", userId: "user2" }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: "Failed to remove member" })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("should return 400 when creator tries to remove themselves", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user1",
    })

    const request = new NextRequest(
      "http://localhost/api/cliques/clique1/members/user1",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1", userId: "user1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      error: "Cannot remove the clique creator. Delete the clique instead.",
    })
    expect(prisma.cliqueMember.delete).not.toHaveBeenCalled()
  })

  it("should successfully remove a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({
      creatorId: "user1",
    })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({
      cliqueId: "clique1",
      userId: "user2",
    })
    ;(prisma.cliqueMember.delete as jest.Mock).mockResolvedValue({})

    const request = new NextRequest(
      "http://localhost/api/cliques/clique1/members/user2",
      { method: "DELETE" }
    )
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "clique1", userId: "user2" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ message: "Member removed" })
    expect(prisma.cliqueMember.delete).toHaveBeenCalledWith({
      where: {
        cliqueId_userId: { cliqueId: "clique1", userId: "user2" },
      },
    })
  })
})
